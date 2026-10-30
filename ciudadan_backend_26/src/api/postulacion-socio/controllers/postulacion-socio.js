'use strict';

/**
 * postulacion-socio controller
 *
 * - `crearPublica` (público, auth:false): el formulario de /candidatos lo
 *   llena gente sin cuenta. Aquí se valida y se persiste con una whitelist
 *   estricta: el visitante SOLO manda sus datos y sus referencias (área y
 *   agencia). El estado, las fechas y el metadata los decide el servidor.
 * - `miAgencia` (admin/socio/root): lista las postulaciones de la agencia
 *   del usuario autenticado. `root` ve todas (bypass server-side).
 * - `resolver` (admin/socio/root): cambia el estado de una postulación
 *   (revisada/contactada/aceptada/rechazada) + notas + auditoría.
 */

const path = require('path');
const { createCoreController } = require('@strapi/strapi').factories;

const UID = 'api::postulacion-socio.postulacion-socio';
const ESTADOS_VALIDOS = ['pendiente', 'revisada', 'contactada', 'aceptada', 'rechazada'];

// Tope del CV (10 MB) — el mismo límite que aplica el frontend.
const MAX_CV_BYTES = 10 * 1024 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Tipos de CV admitidos. La extensión manda (el `Content-Type` lo elige el
// cliente y se puede falsear); el mime se completa si el navegador no lo
// envió, para que plugin-upload registre el tipo correcto.
const MIME_POR_EXTENSION = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};
const EXTENSIONES_CV = Object.keys(MIME_POR_EXTENSION);

const cleanTexto = (valor, max = 255) => {
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim();
  if (!limpio) return null;
  return limpio.slice(0, max);
};

/**
 * Normaliza el id de una relación.
 * @returns {number|null|undefined} null si no viene, undefined si es inválido.
 */
const toIdRelacion = (valor) => {
  if (valor === null || valor === undefined || valor === '') return null;
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) return undefined;
  return id;
};

/**
 * Lee el cuerpo del POST público: acepta JSON plano o multipart/form-data
 * (en multipart el JSON va en el campo `data` y el CV en `files.cv`).
 * @returns {{data: Object, files: Object}|{error: string}}
 */
const leerCuerpo = (ctx) => {
  if (!ctx.is('multipart')) {
    const body = ctx.request.body || {};
    return { data: body.data || body, files: {} };
  }

  const body = ctx.request.body || {};
  let data = null;
  if (typeof body.data === 'string') {
    try {
      data = JSON.parse(body.data);
    } catch (err) {
      return { error: 'El formulario enviado no tiene un formato válido.' };
    }
  } else if (body.data && typeof body.data === 'object') {
    data = body.data;
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { error: 'Falta la información del formulario de postulación.' };
  }

  // Los archivos llegan con el prefijo `files.` (convención de Strapi).
  const files = {};
  const rawFiles = ctx.request.files || {};
  Object.keys(rawFiles).forEach((key) => {
    const partes = key.split('.');
    if (partes[0] === 'files' && partes.length > 1) {
      files[partes.slice(1).join('.')] = rawFiles[key];
    }
  });

  return { data, files };
};

/**
 * Valida el CV recibido (opcional).
 * @returns {{file: Object|null}|{error: string}}
 */
const validarCv = (raw) => {
  if (!raw) return { file: null };

  const archivos = Array.isArray(raw) ? raw : [raw];
  if (archivos.length > 1) {
    return { error: 'Envía un solo archivo de CV.' };
  }

  const file = archivos[0];
  const nombre = typeof file?.name === 'string' ? file.name : '';
  const extension = path.extname(nombre).toLowerCase();

  if (!EXTENSIONES_CV.includes(extension)) {
    return { error: 'El CV debe ser PDF, Word o una imagen (JPG, PNG o WEBP).' };
  }

  const size = Number(file?.size) || 0;
  if (size > MAX_CV_BYTES) {
    return { error: 'El CV supera el límite de 10 MB.' };
  }

  // Si el navegador no mandó el Content-Type, lo deducimos de la extensión.
  if (!file.type) {
    file.type = MIME_POR_EXTENSION[extension];
  }

  return { file };
};

module.exports = createCoreController(UID, ({ strapi }) => ({
  /**
   * POST /api/postulacion-socios (PÚBLICO — auth:false)
   *
   * Recibe el formulario de /candidatos (JSON o multipart con `data` + CV).
   * Sólo se acepta lo que el visitante puede rellenar; el resto (estado,
   * notas, revisado_por, fechas, publishedAt) lo fija el servidor.
   */
  async crearPublica(ctx) {
    const cuerpo = leerCuerpo(ctx);
    if (cuerpo.error) {
      return ctx.badRequest(cuerpo.error);
    }

    const { data, files } = cuerpo;

    // --- Whitelist estricta de lo que llega del visitante -----------------
    const nombre_completo = cleanTexto(data.nombre_completo, 255);
    const email = (cleanTexto(data.email, 255) || '').toLowerCase() || null;
    const telefono = cleanTexto(data.telefono, 64);
    const codigo_pais = cleanTexto(data.codigo_pais, 16);
    const descripcion = cleanTexto(data.descripcion, 4000);

    if (!nombre_completo) {
      return ctx.badRequest('Escribe tu nombre completo.');
    }
    if (!email || !EMAIL_RE.test(email)) {
      return ctx.badRequest('Escribe un correo electrónico válido.');
    }
    if (!telefono) {
      return ctx.badRequest('Escribe un teléfono de contacto.');
    }
    if (!descripcion) {
      return ctx.badRequest('Cuéntanos por qué quieres ser socio.');
    }
    if (data.consentimiento !== true && data.consentimiento !== 'true') {
      return ctx.badRequest('Debes aceptar el consentimiento para enviar tu postulación.');
    }

    // --- Referencias (área / agencia): id válido y existente ---------------
    const areaId = toIdRelacion(data.area);
    const agenciaId = toIdRelacion(data.agencia);
    if (areaId === undefined) {
      return ctx.badRequest('El área seleccionada no es válida.');
    }
    if (agenciaId === undefined) {
      return ctx.badRequest('La agencia seleccionada no es válida.');
    }

    // Sólo se aceptan áreas/agencias PUBLICADAS: son las mismas que el
    // visitante puede ver en el catálogo público (/api/areas, /api/agencias).
    if (areaId) {
      const existeArea = await strapi.db.query('api::area.area').count({
        where: { id: areaId, publishedAt: { $notNull: true } },
      });
      if (!existeArea) {
        return ctx.badRequest('El área seleccionada ya no está disponible.');
      }
    }
    if (agenciaId) {
      const existeAgencia = await strapi.db.query('api::agencia.agencia').count({
        where: { id: agenciaId, publishedAt: { $notNull: true } },
      });
      if (!existeAgencia) {
        return ctx.badRequest('La agencia seleccionada ya no está disponible.');
      }
    }

    // --- CV (opcional) -----------------------------------------------------
    const cv = validarCv(files.cv);
    if (cv.error) {
      return ctx.badRequest(cv.error);
    }

    // --- Datos finales: el servidor manda en estado, fechas y metadata ----
    const ahora = new Date().toISOString();
    const dataFinal = {
      nombre_completo,
      email,
      telefono,
      codigo_pais,
      descripcion,
      estado: 'pendiente',
      fecha_solicitud: ahora,
      publishedAt: ahora,
      metadata: { origen: 'web-candidatos', consentimiento: true },
    };
    if (areaId) dataFinal.area = areaId;
    if (agenciaId) dataFinal.agencia = agenciaId;

    const entidad = await strapi.entityService.create(UID, {
      data: dataFinal,
      ...(cv.file ? { files: { cv: cv.file } } : {}),
    });

    ctx.status = 201;
    ctx.body = {
      data: {
        id: entidad.id,
        nombre_completo: entidad.nombre_completo,
        email: entidad.email,
        estado: entidad.estado,
        fecha_solicitud: entidad.fecha_solicitud,
      },
    };
  },

  /**
   * GET /api/postulacion-socios/mi-agencia
   * La policy is-admin-socio-or-root ya validó el token y dejó
   * ctx.state.strapiUser con su agencia populada.
   */
  async miAgencia(ctx) {
    const caller = ctx.state.strapiUser;
    const extra = Array.isArray(caller.roles?.extra) ? caller.roles.extra : [];
    const esRoot = extra.includes('root');

    // Sin agencia y sin root: no hay nada que mostrar.
    const agenciaId = caller.agencia?.id || null;
    if (!esRoot && !agenciaId) {
      ctx.body = { ok: true, data: [], agencia: null };
      return;
    }

    const where = esRoot ? {} : { agencia: agenciaId };

    const rows = await strapi.entityService.findMany('api::postulacion-socio.postulacion-socio', {
      filters: where,
      populate: { area: true, agencia: true, cv: true, revisado_por: { fields: ['id', 'email'] } },
      sort: { fecha_solicitud: 'desc' },
      limit: 500,
    });

    ctx.body = {
      ok: true,
      agencia: esRoot
        ? { id: null, nombre: 'Todas (root)' }
        : { id: caller.agencia.id, nombre: caller.agencia.nombre },
      esRoot,
      data: rows,
    };
  },

  /**
   * PATCH /api/postulacion-socios/:id/estado
   * Body: { estado, notas? }. Solo la propia agencia (o root). Registra
   * revisado_por + fecha_resolucion.
   */
  async resolver(ctx) {
    const caller = ctx.state.strapiUser;
    const extra = Array.isArray(caller.roles?.extra) ? caller.roles.extra : [];
    const esRoot = extra.includes('root');
    const { id } = ctx.params;
    const { estado, notas } = ctx.request.body || {};

    if (!ESTADOS_VALIDOS.includes(estado)) {
      return ctx.badRequest(`Estado inválido. Usa uno de: ${ESTADOS_VALIDOS.join(', ')}.`);
    }

    const postulacion = await strapi.entityService.findOne('api::postulacion-socio.postulacion-socio', id, {
      populate: { agencia: true },
    });
    if (!postulacion) return ctx.notFound('Postulación no encontrada.');

    // Autorización por agencia: admin/socio solo su propia agencia.
    if (!esRoot) {
      const agenciaCaller = caller.agencia?.id || null;
      const agenciaPost = postulacion.agencia?.id || null;
      if (!agenciaCaller || agenciaCaller !== agenciaPost) {
        return ctx.forbidden('No puedes gestionar postulaciones de otra agencia.');
      }
    }

    const data = {
      estado,
      revisado_por: caller.id,
      fecha_resolucion: new Date().toISOString(),
    };
    if (typeof notas === 'string') data.notas = notas.slice(0, 4000);

    const updated = await strapi.entityService.update('api::postulacion-socio.postulacion-socio', id, { data });

    ctx.body = { ok: true, data: updated };
  },
}));


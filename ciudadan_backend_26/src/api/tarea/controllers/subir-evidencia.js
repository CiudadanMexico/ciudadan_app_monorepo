'use strict';

/**
 * Subir evidencias (archivos) a una tarea.
 *
 * Recibe en el body:
 *   tareaId  — id de la tarea
 *   archivos — array de { nombre, tipo, dataBase64 } donde dataBase64 es el
 *              contenido del archivo codificado en base64 (sin el prefijo data:)
 *   notas    — texto opcional con comentarios del verificador/socio
 *
 * El endpoint decodifica cada archivo, lo guarda en el directorio público de
 * Strapi (uploads), genera la URL pública y registra la evidencia en el
 * campo JSON `media` de la tarea, además de añadir una entrada en
 * `validaciones` con tipo 'evidencia_subida'.
 *
 * Requiere Auth0 + rol admin, socio o verificador (policy global).
 *
 * Restricción de visibilidad por área (spec documento-off.md):
 *   - admin/socio: bypass.
 *   - verificador: solo sube evidencia a tareas cuyo todo tiene área/subárea
 *     que el verificador tiene verificada. Una tarea general/becario puede
 *     recibir evidencia de cualquier verificador.
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const {
  isPrivilegedUser,
  getVerifiedAreaIds,
  loadUserWithRelations,
  NIVELES_GENERAL,
} = require('../../../utils/cowork/visibility');

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const PUBLIC_URL_BASE = '/uploads';

// Tamaño máximo por archivo: 10 MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// MIME types permitidos
const ALLOWED_MIMES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'video/mp4',
  'audio/mpeg',
];

module.exports = {
  async subirEvidencia(ctx) {
    const { tareaId, archivos, notas } = ctx.request.body;

    // --- 1. Validaciones de entrada ---
    if (!tareaId) {
      return ctx.badRequest('Falta el parámetro tareaId');
    }

    if (!Array.isArray(archivos) || archivos.length === 0) {
      return ctx.badRequest('Debe enviar al menos un archivo en el array "archivos"');
    }

    if (archivos.length > 10) {
      return ctx.badRequest('No se pueden subir más de 10 archivos a la vez');
    }

    // --- 2. Verificar que la tarea existe ---
    const tarea = await strapi.entityService.findOne('api::tarea.tarea', tareaId, {
      fields: ['id', 'status', 'media', 'validaciones'],
      populate: { usuario: true, reviewed_by: true, todo: { populate: { areas: true, subareas: true } } },
    });

    if (!tarea) {
      return ctx.notFound('Tarea no encontrada');
    }

    // --- 2b. Restringir verificador a tareas de áreas que verifica ---
    // admin/socio: bypass. Verificador: solo si el todo es general/becario
    // o si tiene área/subárea coincidente con sus verificaciones.
    const usuario = ctx.state.strapiUser;
    if (usuario && !isPrivilegedUser(usuario)) {
      const todo = tarea.todo || null;

      // Tareas generales/becario: cualquier verificador puede subir evidencia.
      const nivel = todo?.nivel;
      if (!NIVELES_GENERAL.includes(nivel)) {
        const fullUser = await loadUserWithRelations(usuario);
        const verifiedAreaIds = new Set(await getVerifiedAreaIds(fullUser));
        const todoAreas = [...(todo?.areas || []), ...(todo?.subareas || [])];
        const matches = todoAreas.some((a) => {
          const id = typeof a === 'object' ? a.id : Number(a);
          return id && verifiedAreaIds.has(id);
        });
        if (!matches) {
          return ctx.forbidden(
            'No tienes un área verificada que coincida con la tarea a la que intentas subir evidencia'
          );
        }
      }
    }

    // --- 3. Asegurar que el directorio de uploads existe ---
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    // --- 4. Procesar cada archivo ---
    const archivosGuardados = [];
    const userEmail = ctx.state.strapiUser?.email || 'desconocido';

    for (const [index, archivo] of archivos.entries()) {
      if (!archivo.nombre || !archivo.tipo || !archivo.dataBase64) {
        return ctx.badRequest(`Archivo ${index + 1}: faltan campos (nombre, tipo, dataBase64)`);
      }

      if (!ALLOWED_MIMES.includes(archivo.tipo)) {
        return ctx.badRequest(`Archivo ${index + 1}: tipo no permitido (${archivo.tipo})`);
      }

      // Decodificar base64
      let buffer;
      try {
        buffer = Buffer.from(archivo.dataBase64, 'base64');
      } catch (e) {
        return ctx.badRequest(`Archivo ${index + 1}: base64 inválido`);
      }

      if (buffer.length > MAX_FILE_SIZE) {
        return ctx.badRequest(
          `Archivo ${index + 1}: excede el tamaño máximo de 10MB (${(buffer.length / 1024 / 1024).toFixed(2)}MB)`
        );
      }

      // Generar nombre único
      const hash = crypto.createHash('sha256').update(buffer).digest('hex').substring(0, 16);
      const ext = path.extname(archivo.nombre) || mimeToExtension(archivo.tipo);
      const safeName = `${Date.now()}_${hash}${ext}`;
      const filePath = path.join(UPLOAD_DIR, safeName);

      // Guardar en disco
      fs.writeFileSync(filePath, buffer);

      const publicUrl = `${PUBLIC_URL_BASE}/${safeName}`;

      // Construir entry con shape canónico. Solo se permiten estas 6 claves
      // (whitelist explícita para evitar prototype pollution u otros inyecciones).
      const entry = {
        nombre: String(archivo.nombre).slice(0, 255),
        tipo: String(archivo.tipo).slice(0, 100),
        url: String(publicUrl),
        size: Number(buffer.length),
        subido_por: String(userEmail).slice(0, 255),
        subido_en: new Date().toISOString(),
      };
      archivosGuardados.push(entry);
    }

    // --- 5. Actualizar el campo media de la tarea ---
    // Filtrar el mediaPrevio para asegurar que cada entry tiene shape canónico
    // (en caso de seeds o migraciones anteriores con shape distinto).
    const MEDIA_REQUIRED_KEYS = ['nombre', 'tipo', 'url', 'size', 'subido_por', 'subido_en'];
    const sanitizeMediaEntry = (m) => {
      if (!m || typeof m !== 'object' || Array.isArray(m)) return null;
      const hasAll = MEDIA_REQUIRED_KEYS.every((k) => k in m && m[k] !== undefined && m[k] !== null);
      if (!hasAll) return null;
      const out = {};
      for (const k of MEDIA_REQUIRED_KEYS) {
        out[k] = k === 'size' ? Number(m[k]) : String(m[k]);
      }
      return out;
    };
    const mediaPrevioRaw = Array.isArray(tarea.media) ? tarea.media : [];
    const mediaPrevio = mediaPrevioRaw.map(sanitizeMediaEntry).filter(Boolean);
    const mediaActualizado = [...mediaPrevio, ...archivosGuardados];

    // --- 6. Registrar en validaciones ---
    const validacionesPrevias = Array.isArray(tarea.validaciones) ? tarea.validaciones : [];
    const nuevaValidacion = {
      tipo: 'evidencia_subida',
      archivos: archivosGuardados.map((a) => ({ nombre: a.nombre, url: a.url })),
      notas: notas || '',
      reviewed_by: userEmail,
      fecha: new Date().toISOString(),
    };

    await strapi.entityService.update('api::tarea.tarea', tareaId, {
      data: {
        media: mediaActualizado,
        validaciones: [...validacionesPrevias, nuevaValidacion],
      },
    });

    ctx.body = {
      data: {
        tareaId: Number(tareaId),
        archivos: archivosGuardados,
        validacion: nuevaValidacion,
      },
      meta: {
        totalArchivos: archivosGuardados.length,
        subido_por: userEmail,
      },
    };
  },
};

function mimeToExtension(mime) {
  const map = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'application/pdf': '.pdf',
    'text/plain': '.txt',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'video/mp4': '.mp4',
    'audio/mpeg': '.mp3',
  };
  return map[mime] || '.bin';
}

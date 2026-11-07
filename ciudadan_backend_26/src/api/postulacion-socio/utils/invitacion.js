'use strict';

/**
 * Alta de la INVITACIÓN de una agencia a un candidato y avisos por correo.
 *
 * Contexto real del repo (no inventado):
 *  - content-type `api::invitacion.invitacion` (collectionName "invitaciones",
 *    `draftAndPublish: true`, `agencia` = RELACIÓN manyToOne a
 *    `api::agencia.agencia`, `estado` = pendiente|rechazada|aceptada);
 *  - el servicio de correo real es `src/services/brevo` (NO existe
 *    `src/services/brevo/candidatosService.js`): de ahí se reutilizan
 *    `escapar`, `esEmailValido`, `leerConfig` y `enviar`;
 *  - `brevo.enviar` NO lanza (devuelve `{enviado, motivo}`), pero aquí se
 *    wrappea en try/catch para que un fallo de correo sea de verdad
 *    best-effort y NUNCA rompa la aceptación de una postulación.
 *
 * Reglas de negocio:
 *  - idempotencia: una invitación por (correo, agencia). Una segunda
 *    aceptación de la misma postulación reutiliza la invitación existente;
 *  - el aviso al candidato va a su correo; el aviso a la agencia va al buzón
 *    del equipo (`BREVO_NOTIFICACION_EMAIL`) porque el content-type
 *    `agencia` NO tiene atributo `email`;
 *  - nada de este módulo escribe secretos ni imprime credenciales.
 */

const brevo = require('../../../services/brevo');

const UID_INVITACION = 'api::invitacion.invitacion';

const limpiar = (valor) => String(valor === null || valor === undefined ? '' : valor).trim();

/** Escape de HTML delegando en el servicio real de Brevo (& < > " '). */
const escapar = (valor) => brevo.escapar(valor);

/** Valida el formato del correo con el mismo patrón del servicio de Brevo. */
const esEmailValido = (valor) => brevo.esEmailValido(valor);

/**
 * Id de la agencia de la postulación. La relación puede venir poblada
 * (objeto con `id`) o como id suelto.
 * @returns {number|null}
 */
function idAgencia(postulacion) {
  const agencia = postulacion && postulacion.agencia;
  if (!agencia) return null;
  if (typeof agencia === 'object') {
    const id = Number(agencia.id);
    return Number.isInteger(id) && id > 0 ? id : null;
  }
  const id = Number(agencia);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Nombre de la agencia (solo si la relación viene poblada). */
function nombreAgencia(postulacion) {
  const agencia = postulacion && postulacion.agencia;
  if (agencia && typeof agencia === 'object') return limpiar(agencia.nombre);
  return '';
}

/**
 * Busca la invitación ya existente para (correo, agencia).
 * La relación `agencia` se filtra por su id (filtro estándar de Strapi v4).
 */
async function buscarInvitacion({ strapi, email, agenciaId }) {
  const existentes = await strapi.entityService.findMany(UID_INVITACION, {
    filters: { email, agencia: agenciaId },
    limit: 1,
  });
  return (existentes || [])[0] || null;
}

/**
 * Crea la invitación (o reutiliza la existente). SOLO base de datos: aquí no
 * se envía ningún correo, para poder meter el alta dentro de la transacción
 * del controlador y notificar DESPUÉS de que la transacción cierre bien.
 *
 * @returns {Promise<{creada: boolean, motivo: string|null, invitacion: object|null}>}
 */
async function crearInvitacion({ strapi, postulacion, ahora = new Date().toISOString() }) {
  const email = limpiar(postulacion && postulacion.email).toLowerCase();
  if (!email || !esEmailValido(email)) {
    return { creada: false, motivo: 'correo-invalido', invitacion: null };
  }
  const agenciaId = idAgencia(postulacion);
  if (!agenciaId) {
    return { creada: false, motivo: 'sin-agencia', invitacion: null };
  }

  const existente = await buscarInvitacion({ strapi, email, agenciaId });
  if (existente) {
    // Idempotencia: se reutiliza y se deja constancia de la postulación
    // origen, sin crear una segunda invitación ni reenviar el correo.
    const metadata = existente.metadata && typeof existente.metadata === 'object' ? existente.metadata : {};
    const origenes = Array.isArray(metadata.postulaciones)
      ? metadata.postulaciones.slice()
      : (metadata.postulacion_id ? [metadata.postulacion_id] : []);
    const idPostulacion = postulacion.id ?? null;
    if (idPostulacion !== null && !origenes.includes(idPostulacion)) {
      origenes.push(idPostulacion);
      try {
        await strapi.entityService.update(UID_INVITACION, existente.id, {
          data: { metadata: { ...metadata, postulaciones: origenes } },
        });
      } catch (err) {
        // La anotación es un extra: si falla, la invitación sigue siendo válida.
      }
    }
    return { creada: false, motivo: 'ya-existe', invitacion: existente };
  }

  const idPostulacion = postulacion.id ?? null;
  const data = {
    email,
    nombre: limpiar(postulacion && postulacion.nombre_completo) || null,
    estado: 'pendiente',
    agencia: agenciaId,
    fecha_invitacion: ahora,
    metadata: {
      origen: 'postulacion-socio',
      postulacion_id: idPostulacion,
      postulaciones: idPostulacion === null ? [] : [idPostulacion],
    },
    // `invitacion` tiene draftAndPublish: se publica para que la agencia la
    // pueda listar en /api/invitaciones (lo que ya consume el frontend).
    publishedAt: ahora,
  };

  const invitacion = await strapi.entityService.create(UID_INVITACION, { data });
  return { creada: true, motivo: null, invitacion };
}

/** Plantilla del correo al candidato invitado. */
function plantillaInvitacionCandidato({ nombre, agenciaNombre } = {}) {
  const nombreCandidato = escapar(nombre);
  const agencia = escapar(agenciaNombre || 'la agencia');
  const saludo = nombreCandidato ? `Hola ${escapar(nombre).split(' ')[0]}:` : 'Hola:';
  return {
    subject: `Invitación de ${agenciaNombre || 'Ciudadan'} para integrarte al equipo`,
    htmlContent: [
      '<div style="margin:0;padding:24px;background:#f4f6f5;font-family:Arial,Helvetica,sans-serif;color:#14211c">',
      '<div style="max-width:560px;margin:0 auto;background:#07120f;border-radius:14px;padding:28px">',
      '<p style="margin:0 0 6px;color:#19d79c;font-size:12px;letter-spacing:.08em;text-transform:uppercase">Ciudadan</p>',
      '<h1 style="margin:0 0 16px;color:#ffffff;font-size:22px;line-height:1.25">Te الأمريmos al equipo</h1>',
      `<p style="margin:0 0 14px;color:#a2c4b9;font-size:15px;line-height:1.6">${saludo}</p>`,
      `<p style="margin:0 0 14px;color:#a2c4b9;font-size:15px;line-height:1.6">` +
        `Tu postulación como socio/a de <strong style="color:#ffffff">${agencia}</strong> fue aceptada. ` +
        'Ya existe una invitación formal a tu nombre.</p>',
      '<p style="margin:0 0 14px;color:#a2c4b9;font-size:15px;line-height:1.6">' +
        'El equipo de la agencia te contactará para continuar con el proceso y coordinar los siguientes pasos.</p>',
      '<p style="margin:26px 0 0;color:#a2c4b9;font-size:12px">Ciudadan · Programa de Socios Estatales</p>',
      '</div></div>',
    ].join(''),
    textContent: [
      saludo,
      '',
      `Tu postulación como socio/a de ${agenciaNombre || 'Ciudadan'} fue aceptada.`,
      'Ya existe una invitación formal a tu nombre.',
      'El equipo de la agencia te contactará para continuar con el proceso.',
      '',
      'Ciudadan · Programa de Socios Estatales',
    ].join('\n'),
  };
}

/** Plantilla del aviso interno (agencia / equipo) de la aceptación. */
function plantillaInvitacionEquipo({ nombre, email, telefono, agenciaNombre, postulacionId } = {}) {
  const estadoLabel = 'Aceptada';
  return {
    subject: `Invitación creada · ${limpiar(nombre) || 'candidato'} · ${agenciaNombre || 'agencia'}`,
    htmlContent: [
      '<div style="margin:0;padding:24px;background:#f4f6f5;font-family:Arial,Helvetica,sans-serif;color:#14211c">',
      '<div style="max-width:560px;margin:0 auto;background:#07120f;border-radius:14px;padding:28px">',
      '<p style="margin:0 0 6px;color:#19d79c;font-size:12px;letter-spacing:.08em;text-transform:uppercase">Ciudadan</p>',
      '<h1 style="margin:0 0 16px;color:#ffffff;font-size:22px;line-height:1.25">Se creó una invitación</h1>',
      `<p style="margin:0 0 14px;color:#a2c4b9;font-size:15px;line-height:1.6">` +
        `Al aceptar la postulación de <strong style="color:#ffffff">${escapar(nombre)}</strong> ` +
        `(${escapar(email || 'sin correo')}) se creó la invitación correspondiente.</p>`,
      `<p style="margin:0 0 14px;color:#a2c4b9;font-size:15px;line-height:1.6">` +
        `Agencia: ${escapar(agenciaNombre || 'sin agencia')} · Teléfono: ${escapar(telefono || 'sin teléfono')} · ` +
        `Postulación: ${escapar(String(postulacionId ?? ''))}</p>`,
      '<p style="margin:0 0 14px;color:#a2c4b9;font-size:15px;line-height:1.6">' +
        'La invitación queda en estado «pendiente» hasta que la agencia la gestione.</p>',
      '<p style="margin:26px 0 0;color:#a2c4b9;font-size:12px">Ciudadan · Programa de Socios Estatales</p>',
      '</div></div>',
    ].join(''),
    textContent: [
      'Se creó una invitación.',
      `Candidato: ${limpiar(nombre) || 'sin nombre'} (${limpiar(email) || 'sin correo'})`,
      `Teléfono: ${limpiar(telefono) || 'sin teléfono'}`,
      `Agencia: ${limpiar(agenciaNombre) || 'sin agencia'}`,
      `Postulación: ${postulacionId ?? ''}`,
      `Estado de la postulación: ${estadoLabel}`,
      '',
      'Ciudadan · Programa de Socios Estatales',
    ].join('\n'),
  };
}

/**
 * Envío best-effort: convierte cualquier excepción en un resultado y nunca
 * propaga el error.
 */
async function enviarSeguro(fn) {
  try {
    const resultado = await fn();
    return {
      enviado: Boolean(resultado && resultado.enviado),
      motivo: (resultado && resultado.motivo) || null,
      status: (resultado && resultado.status) || null,
    };
  } catch (err) {
    return {
      enviado: false,
      motivo: 'error-excepcion',
      detalle: String((err && err.message) || err).slice(0, 200),
    };
  }
}

/**
 * Avisos por correo de la invitación: al candidato y al buzón del equipo
 * (el content-type `agencia` no tiene email). Nunca lanza.
 */
async function notificarInvitacion({ strapi, postulacion, invitacion } = {}) {
  const email = limpiar(postulacion && postulacion.email).toLowerCase();
  const nombre = limpiar(postulacion && postulacion.nombre_completo);
  const telefono = limpiar(postulacion && postulacion.telefono);
  const agenciaNombre = nombreAgencia(postulacion);
  const resultado = { candidato: null, equipo: null };

  if (email && esEmailValido(email)) {
    resultado.candidato = await enviarSeguro(() => brevo.enviar({
      to: email,
      toName: nombre,
      tags: ['hackabot', 'invitacion'],
      senderName: 'Ciudadan',
      ...plantillaInvitacionCandidato({ nombre, agenciaNombre }),
    }));
  } else {
    resultado.candidato = { enviado: false, motivo: 'sin-correo-postulante' };
  }

  let config = { equipo: [] };
  try { config = brevo.leerConfig(); } catch (err) { config = { equipo: [] }; }
  if (Array.isArray(config.equipo) && config.equipo.length) {
    resultado.equipo = await enviarSeguro(() => brevo.enviar({
      to: config.equipo,
      replyTo: email || undefined,
      tags: ['hackabot', 'invitacion', 'interno'],
      senderName: 'Ciudadan',
      ...plantillaInvitacionEquipo({
        nombre,
        email,
        telefono,
        agenciaNombre,
        postulacionId: postulacion && postulacion.id,
      }),
    }));
  } else {
    resultado.equipo = { enviado: false, motivo: 'sin-buzon-equipo' };
  }

  return resultado;
}

/**
 * Flujo completo: alta idempotente + avisos best-effort.
 * (El controlador usa `crearInvitacion` dentro de la transacción y llama a
 * `notificarInvitacion` después; este atajo es para usos directos.)
 */
async function crearInvitacionYNotificar({ strapi, postulacion, ahora } = {}) {
  const alta = await crearInvitacion({ strapi, postulacion, ahora });
  if (!alta.creada) return { ...alta, correo: null };
  const correo = await notificarInvitacion({ strapi, postulacion, invitacion: alta.invitacion });
  return { ...alta, correo };
}

module.exports = {
  UID_INVITACION,
  crearInvitacion,
  crearInvitacionYNotificar,
  notificarInvitacion,
  buscarInvitacion,
  plantillaInvitacionCandidato,
  plantillaInvitacionEquipo,
  idAgencia,
  nombreAgencia,
  escapar,
  esEmailValido,
};

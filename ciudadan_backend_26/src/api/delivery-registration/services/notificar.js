'use strict';

/**
 * Notificaciones de cambio de estado del expediente (spec decision 13):
 * se REUTILIZA el sistema existente (api::notificacion.notificacion) —
 * persistencia via createForUser + tiempo real via emitRealtime (best-effort,
 * al room por email del destinatario). NUNCA un canal paralelo.
 *
 * La notificacion es best-effort a proposito: si el socket-service esta caido
 * la notificacion ya quedo persistida y el usuario la ve al refrescar
 * (services/notificacion.js:171-173 del modulo existente).
 */

const { UIDS } = require('../utils/constants');

async function notificar({ to, titulo, mensaje, tipo, link = null, meta = null }) {
  const strapi = global.strapi;
  try {
    const svc = strapi.service(UIDS.NOTIFICACION);
    const entity = await svc.createForUser({ to, title: titulo, message: mensaje, type: tipo, link, meta });
    const dto = svc.toPublicNotification ? svc.toPublicNotification(entity) : entity;
    await svc.emitRealtime({ email: entity?.user_email || to, notification: dto });
    return { ok: true };
  } catch (err) {
    global.strapi.log.warn(`delivery notificar: fallo best-effort: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

module.exports = { notificar };

'use strict';
const { createHash } = require('node:crypto');
const { validarRegistro } = require('../utils/prelanzamiento');
const UID = 'api::postulacion.postulacion';

module.exports = {
  async registrar(ctx) {
    const input = ctx.request.body?.data;
    if (!input || typeof input !== 'object' || Array.isArray(input)) return ctx.badRequest('Registro inválido.');
    const { data, errors } = validarRegistro(input);
    if (Object.keys(errors).length) return ctx.badRequest(Object.values(errors)[0], { fields: errors });
    const clave = createHash('sha256').update(`prelanzamiento-2026:${data.telefono}`).digest('hex');
    const query = strapi.db.query(UID);
    const duplicate = () => ctx.conflict('Este WhatsApp ya tiene una solicitud de prelanzamiento. Nuestro equipo te contactará para continuar.');
    if (await query.findOne({ where: { prelanzamiento_clave: clave }, select: ['id'] })) return duplicate();
    try {
      await strapi.entityService.create(UID, { data: {
        posicion: `prelanzamiento:${data.tipo}`,
        fecha_solicitud: data.fecha,
        status: 'pendiente',
        publishedAt: null,
        prelanzamiento_clave: clave,
        prelanzamiento_datos: data,
      } });
    } catch (error) {
      // La restricción única protege también contra envíos simultáneos.
      if (await query.findOne({ where: { prelanzamiento_clave: clave }, select: ['id'] })) return duplicate();
      strapi.log.error('[prelanzamiento] No se pudo guardar la solicitud', { name: error.name });
      return ctx.internalServerError('No pudimos guardar tu solicitud. Inténtalo de nuevo.');
    }
    ctx.status = 201;
    ctx.body = { data: { recibido: true, tipo: data.tipo, promocionReservada: data.promocionReservada } };
  },
};

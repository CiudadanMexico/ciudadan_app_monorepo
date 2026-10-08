'use strict';
const { createHash } = require('node:crypto');
const { validarRegistro } = require('../utils/prelanzamiento');
const brevo = require('../../../services/brevo');
const UID = 'api::postulacion.postulacion';

/**
 * Avisa por correo la postulación (confirmación al postulante + aviso al
 * equipo). Es *best-effort*: la solicitud ya quedó guardada, así que un fallo o
 * falta de configuración de Brevo solo se registra en el log y NO altera la
 * respuesta que recibe el usuario.
 *
 * El nombre del remitente lo define este módulo (no el .env): cada flujo que
 * envíe correos elige el suyo al llamar a brevo.
 */
async function avisarPorCorreo(data) {
  try {
    const { confirmacion, aviso } = await brevo.enviarPostulacionSocioEstatal({
      datos: data,
      senderNameConfirmacion: 'Ciudadan · Socios Estatales',
      senderNameAviso: 'Ciudadan · Avisos',
    });
    if (!confirmacion.enviado) {
      strapi.log.warn(`[prelanzamiento] confirmación por correo no enviada (${confirmacion.motivo})`);
    }
    if (!aviso.enviado) {
      strapi.log.warn(`[prelanzamiento] aviso al equipo no enviado (${aviso.motivo})`);
    }
  } catch (error) {
    strapi.log.error('[prelanzamiento] error inesperado enviando correos', { name: error.name });
  }
}


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
        email: data.email || null,
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
    // Solo las postulaciones de Socio Estatal disparan correos: es el único
    // formulario que captura el correo del postulante (SocioEstatalForm).
    if (data.tipo === 'socio-estatal') await avisarPorCorreo(data);
    ctx.status = 201;
    ctx.body = { data: { recibido: true, tipo: data.tipo, promocionReservada: data.promocionReservada } };
  },
};

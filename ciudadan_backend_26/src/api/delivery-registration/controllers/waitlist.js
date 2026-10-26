'use strict';

/**
 * Lista de espera de repartidores (spec §12A): alta voluntaria con
 * consentimiento, dedup por email unico y baja explicita.
 *
 * El email SIEMPRE se resuelve desde la sesion Auth0 (ctx.state.strapiUser):
 * nunca se confia el email del payload.
 */
module.exports = {
  async suscribir(ctx) {
    const { suscribir } = require('../services/waitlist-service');

    const user = ctx.state.strapiUser;
    const { email, city, municipality, consent } = ctx.request.body || {};

    const emailSesion = String(user.email || '').trim().toLowerCase();
    const emailBody = String(email || '').trim().toLowerCase();
    if (emailBody && emailBody !== emailSesion) {
      return ctx.badRequest('Usa el correo de tu sesion para suscribirte a la lista de espera');
    }

    const resultado = await suscribir({
      email: emailSesion,
      city,
      municipality,
      consent,
      ip: ctx.ip,
    });

    ctx.body = {
      ok: true,
      creado: resultado.creado,
      reactivado: resultado.reactivado,
      mensaje:
        'Te avisaremos cuando Ciudadan abra cobertura de repartidores en tu ciudad. No te pedimos documentos por ahora.',
    };
  },

  async baja(ctx) {
    const { baja } = require('../services/waitlist-service');

    const user = ctx.state.strapiUser;
    const emailSesion = String(user.email || '').trim().toLowerCase();
    const emailBody = String(ctx.request.body?.email || '').trim().toLowerCase();
    if (emailBody && emailBody !== emailSesion) {
      return ctx.badRequest('Solo puedes darte de baja con el correo de tu sesion');
    }

    const resultado = await baja({ email: emailSesion });
    ctx.body = { ok: true, estado: resultado.estado };
  },
};

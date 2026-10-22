'use strict';

/**
 * Expediente del solicitante: iniciar (idempotente), consultar el propio,
 * actualizar campos permitidos y enviar a revision. Toda la autorizacion
 * viene de ctx.state.strapiUser (policy is-authenticated-auth0); el body
 * nunca puede tocar status, reviewer, agency de otro, roles ni eventos.
 */
module.exports = {
  async iniciar(ctx) {
    const { iniciarExpediente } = require('../services/expediente-service');
    const { agency_id, territory } = ctx.request.body || {};

    const { creado, profile } = await iniciarExpediente({
      user: ctx.state.strapiUser,
      agency_id,
      territory,
    });

    ctx.body = {
      ok: true,
      creado,
      profile: { id: profile.id, status: profile.status, agency: profile.agency, territory_ref: profile.territory_ref },
    };
  },

  async mi(ctx) {
    const { miExpediente } = require('../services/expediente-service');
    const resultado = await miExpediente(ctx.state.strapiUser);
    ctx.body = { ok: true, ...resultado };
  },

  async actualizar(ctx) {
    const { actualizarExpediente } = require('../services/expediente-service');
    const profile = await actualizarExpediente({ user: ctx.state.strapiUser, body: ctx.request.body || {} });
    ctx.body = { ok: true, data: { id: profile.id, status: profile.status } };
  },

  async enviar(ctx) {
    const { enviarExpediente } = require('../services/expediente-service');
    const resultado = await enviarExpediente({ user: ctx.state.strapiUser });
    ctx.body = { ok: true, ...resultado };
  },
};

'use strict';

/**
 * Bandeja federal: casos con senales de riesgo ALTA y su resolucion.
 * La policy is-delivery-federal exige agencia federal (o root).
 */
module.exports = {
  async casos(ctx) {
    const { casos } = require('../services/federal-service');
    const resultado = await casos(ctx.state.strapiUser, {
      limit: ctx.query?.limit,
      start: ctx.query?.start,
    });
    ctx.body = { ok: true, ...resultado };
  },

  async resolver(ctx) {
    const { resolver } = require('../services/federal-service');
    const resultado = await resolver(ctx.state.strapiUser, ctx.params.signalId, ctx.request.body || {});
    ctx.body = { ok: true, ...resultado };
  },
};

'use strict';

/**
 * Capacitacion: el cuestionario viaja SIN respuestas correctas; la
 * calificacion es server-side y cada intento se persiste.
 */
module.exports = {
  async cuestionario(ctx) {
    const { cuestionario } = require('../services/expediente-service');
    const resultado = await cuestionario(ctx.state.strapiUser);
    ctx.body = { ok: true, ...resultado };
  },

  async presentar(ctx) {
    const { presentarExamen } = require('../services/expediente-service');
    const { respuestas } = ctx.request.body || {};
    const resultado = await presentarExamen({ user: ctx.state.strapiUser, respuestas });
    ctx.body = { ok: true, ...resultado };
  },
};

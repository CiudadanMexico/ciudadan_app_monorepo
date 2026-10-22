'use strict';

/**
 * GET /api/delivery-registration/coverage?territory=CDMX
 * Agencias activas elegibles para la ciudad de operacion (MVP: CDMX).
 * Si no hay cobertura, la respuesta lo indica para ofrecer la lista de espera.
 */
module.exports = {
  async listar(ctx) {
    const { agenciasElegibles } = require('../services/expediente-service');

    const territory = (ctx.query?.territory || 'CDMX').toUpperCase();
    const resultado = await agenciasElegibles(territory);

    if (!resultado.ok) {
      return ctx.badRequest(resultado.error);
    }

    ctx.body = {
      ok: true,
      territory: resultado.territory,
      coverage_version: resultado.coverage_version,
      data: resultado.data,
      waitlist: resultado.waitlist,
    };
  },
};

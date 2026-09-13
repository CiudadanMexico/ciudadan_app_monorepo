'use strict';

/**
 * Controller custom: config pública de la landing de Líderes Verificadores.
 * GET /api/driver-verifier/public-config
 */
module.exports = {
  async getPublicConfig(ctx) {
    ctx.body = await strapi
      .service('api::driver-verifier-candidacy.driver-verifier-candidacy')
      .getPublicConfig();
  },
};
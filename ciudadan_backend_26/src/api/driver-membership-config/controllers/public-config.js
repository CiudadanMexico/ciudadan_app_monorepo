'use strict';

module.exports = {
  async getPublicConfig(ctx) {
    const data = await strapi.service('api::driver-membership-config.driver-membership-config').getPublicConfig();
    ctx.body = { data };
  },
};

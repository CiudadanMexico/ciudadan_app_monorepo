'use strict';

/**
 * driver service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::driver.driver', ({ strapi }) => ({
  /**
   * Precio de membresía efectivo de un conductor. El servidor decide: el
   * frontend jamás envía ni sobreescribe precios.
   * @param {object} driver registro `api::driver.driver` (o sus campos promo)
   */
  async resolveMembershipPrice(driver) {
    return strapi
      .service('api::driver-membership-config.driver-membership-config')
      .resolveDriverMembershipPrice(driver);
  },
}));


'use strict';

/**
 * driver-launch-lead service (CRUD admin).
 * La lógica de promo/Brevo vive en services/promo.js y services/brevo.js.
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::driver-launch-lead.driver-launch-lead');

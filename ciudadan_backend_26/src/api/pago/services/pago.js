'use strict';

/**
 * pago service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::pago.pago');

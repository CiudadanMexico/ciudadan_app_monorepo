'use strict';

/**
 * shipping-quote service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::shipping-quote.shipping-quote');

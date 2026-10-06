'use strict';

/**
 * shipment-package service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::shipment-package.shipment-package');

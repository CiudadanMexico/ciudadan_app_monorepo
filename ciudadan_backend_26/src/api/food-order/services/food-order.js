'use strict';

/**
 * food-order service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::food-order.food-order');

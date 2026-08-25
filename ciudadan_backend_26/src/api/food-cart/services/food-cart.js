'use strict';

/**
 * food-cart service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::food-cart.food-cart');

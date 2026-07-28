'use strict';

/**
 * food-product service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::food-product.food-product');

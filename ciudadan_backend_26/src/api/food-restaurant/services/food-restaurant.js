'use strict';

/**
 * food-restaurant service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::food-restaurant.food-restaurant');

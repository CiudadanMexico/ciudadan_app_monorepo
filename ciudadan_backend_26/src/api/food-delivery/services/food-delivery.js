'use strict';

/**
 * food-delivery service
 */

// @ts-ignore
const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::food-delivery.food-delivery');

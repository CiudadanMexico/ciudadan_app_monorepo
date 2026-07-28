'use strict';

/**
 * food-modifier service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::food-modifier.food-modifier');

'use strict';

/**
 * my-agency service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::my-agency.my-agency');

'use strict';

/**
 * membresia service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::membresia.membresia');

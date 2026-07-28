'use strict';

/**
 * planta service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::planta.planta');

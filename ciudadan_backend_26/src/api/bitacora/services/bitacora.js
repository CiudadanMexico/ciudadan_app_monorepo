'use strict';

/**
 * bitacora service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::bitacora.bitacora');

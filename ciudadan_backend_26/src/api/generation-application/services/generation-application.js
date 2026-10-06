'use strict';

/**
 * generation-application service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::generation-application.generation-application');

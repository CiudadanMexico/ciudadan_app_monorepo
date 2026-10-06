'use strict';

/**
 * generation-application router (CRUD core para panel de administración;
 * el registro público vive en 01-generation-application-submit.js)
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::generation-application.generation-application');

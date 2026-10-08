'use strict';

/**
 * packaging-template
 */

const { createCoreController, createCoreRouter, createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::packaging-template.packaging-template');

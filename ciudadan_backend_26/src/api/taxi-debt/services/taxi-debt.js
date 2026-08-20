'use strict';

/**
 * taxi-debt service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::taxi-debt.taxi-debt');

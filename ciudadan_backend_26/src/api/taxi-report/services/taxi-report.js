'use strict';

/**
 * taxi-report service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::taxi-report.taxi-report');

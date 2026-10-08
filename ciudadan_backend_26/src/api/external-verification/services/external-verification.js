'use strict';

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::external-verification.external-verification');

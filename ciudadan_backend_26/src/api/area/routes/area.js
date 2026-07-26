'use strict';

/**
 * area router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::area.area', {
  config: {
    // find/findOne quedan públicos (lectura de áreas para todos)
    find: { auth: false },
    findOne: { auth: false },
    create: { auth: false, policies: ['global::is-admin-or-socio'] },
    update: { auth: false, policies: ['global::is-admin-or-socio'] },
    delete: { auth: false, policies: ['global::is-admin-or-socio'] },
  },
});

'use strict';

/**
 * area router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::area.area', {
  config: {
    // find/findOne quedan públicos (lectura de áreas para todos).
    // allow-public-relations evita que Strapi borre en silencio el populate
    // de parent_area/subareas — ver src/policies/allow-public-relations.js.
    find: { auth: false, policies: ['global::allow-public-relations'] },
    findOne: { auth: false, policies: ['global::allow-public-relations'] },
    create: { auth: false, policies: ['global::is-admin-or-socio'] },
    update: { auth: false, policies: ['global::is-admin-or-socio'] },
    delete: { auth: false, policies: ['global::is-admin-or-socio'] },
  },
});

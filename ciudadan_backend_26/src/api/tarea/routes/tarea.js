'use strict';

/**
 * tarea router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::tarea.tarea', {
  config: {
    // find/findOne quedan públicos (lectura de tareas para cualquier usuario logueado).
    // allow-public-relations evita que Strapi borre en silencio el populate
    // de relaciones (usuario, todo, etc.) — ver src/policies/allow-public-relations.js.
    find: { auth: false, policies: ['global::allow-public-relations'] },
    findOne: { auth: false, policies: ['global::allow-public-relations'] },
    // create/delete requieren autenticación (cualquier usuario logueado puede resolver)
    create: { auth: false, policies: ['global::is-authenticated-auth0'] },
    // update incluye verificación (rol verificador) y calificación (admin/socio)
    update: { auth: false, policies: ['global::is-admin-or-socio-or-verificador'] },
    // delete queda restringido a admin/socio (dueño del todo)
    delete: { auth: false, policies: ['global::is-admin-or-socio'] },
  },
});

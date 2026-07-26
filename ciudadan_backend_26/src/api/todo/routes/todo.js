'use strict';

/**
 * todo router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::todo.todo', {
  config: {
    // find/findOne quedan públicos (visibilidad de tareas generales sin login)
    find: { auth: false },
    findOne: { auth: false },
    // create/update/delete: solo admin/socio (socio es el creador de tareas)
    create: { auth: false, policies: ['global::is-admin-or-socio'] },
    update: { auth: false, policies: ['global::is-admin-or-socio'] },
    delete: { auth: false, policies: ['global::is-admin-or-socio'] },
  },
});

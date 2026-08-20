'use strict';

/**
 * todo router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::todo.todo', {
  config: {
    // find/findOne quedan públicos (visibilidad de tareas generales sin login).
    // La policy allow-public-relations es necesaria para que el populate de
    // relaciones (areas, subareas, skills, etc.) no se borre en silencio —
    // ver explicación completa en src/policies/allow-public-relations.js.
    // try-auth0-user identifica al usuario SI trae token válido (sin
    // bloquear si no trae) — sin esto, el controller SIEMPRE veía user
    // undefined y forzaba nivel=general/becario para todos, incluyendo
    // especialistas verificados y admin/socio (bug real, ver el comentario
    // completo en src/policies/try-auth0-user.js).
    find: { auth: false, policies: ['global::try-auth0-user', 'global::allow-public-relations'] },
    findOne: { auth: false, policies: ['global::try-auth0-user', 'global::allow-public-relations'] },
    // create/update/delete: solo admin/socio (socio es el creador de tareas)
    create: { auth: false, policies: ['global::is-admin-or-socio'] },
    update: { auth: false, policies: ['global::is-admin-or-socio'] },
    delete: { auth: false, policies: ['global::is-admin-or-socio'] },
  },
});

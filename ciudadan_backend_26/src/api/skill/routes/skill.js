'use strict';

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::skill.skill', {
  config: {
    // find/findOne quedan públicos (lectura de skills activas para cualquiera),
    // pero try-auth0-user identifica al usuario SI trae token válido — sin
    // esto, el controller nunca podía distinguir admin/verificador de un
    // visitante y siempre ocultaba las skills inactivas incluso a quien
    // debía verlas completas (mismo patrón que el fix de todo.js).
    find: { auth: false, policies: ['global::try-auth0-user'] },
    findOne: { auth: false, policies: ['global::try-auth0-user'] },
    create: { auth: false, policies: ['global::is-authenticated-auth0'] },
    update: { auth: false, policies: ['global::is-authenticated-auth0'] },
    delete: { auth: false, policies: ['global::is-authenticated-auth0'] },
  },
});

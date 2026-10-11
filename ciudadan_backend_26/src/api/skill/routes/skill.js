'use strict';

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::skill.skill', {
  config: {
    // find/findOne quedan públicos (lectura de skills activas para cualquiera),
    // pero try-auth0-user identifica al usuario SI trae token válido — sin
    // esto, el controller nunca podía distinguir admin/verificador de un
    // visitante y siempre ocultaba las skills inactivas incluso a quien
    // debía verlas completas (mismo patrón que el fix de todo.js).
    //
    // allow-public-relations es OBLIGATORIA aquí por el mismo motivo que en
    // todo/tarea/area: con auth:false, ctx.state.auth queda undefined y el
    // sanitizador de Strapi (throw/remove-restricted-relations) BORRA en
    // silencio cualquier relación poblada de la respuesta. Sin ella,
    // populate[areas] de skills nunca llegaba al frontend — y con eso,
    // areaOptions() en AgregarTarea veía "0 skills" y mostraba "No hay áreas
    // disponibles para este nivel" aunque la relación existiera en la DB.
    // Ver src/policies/allow-public-relations.js.
    find: { auth: false, policies: ['global::try-auth0-user', 'global::allow-public-relations'] },
    findOne: { auth: false, policies: ['global::try-auth0-user', 'global::allow-public-relations'] },
    create: { auth: false, policies: ['global::is-authenticated-auth0'] },
    update: { auth: false, policies: ['global::is-authenticated-auth0'] },
    delete: { auth: false, policies: ['global::is-authenticated-auth0'] },
  },
});

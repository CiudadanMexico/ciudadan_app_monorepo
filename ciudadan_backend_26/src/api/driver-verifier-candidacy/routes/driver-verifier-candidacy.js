'use strict';

/**
 * driver-verifier-candidacy router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::driver-verifier-candidacy.driver-verifier-candidacy', {
  config: {
    // find/findOne públicos para lectura de candidaturas (mismo criterio
    // que agencia/todo/tarea). La escritura la gobierna la lógica custom
    // posterior (registro de candidatura), no estas rutas genéricas.
    find: { auth: false },
    findOne: { auth: false },
  },
});
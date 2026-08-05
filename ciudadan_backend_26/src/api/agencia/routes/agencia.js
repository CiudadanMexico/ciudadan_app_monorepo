'use strict';

/**
 * agencia router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::agencia.agencia', {
  config: {
    // find/findOne públicos, igual que todo/tarea/area/skill. Sin esto,
    // cualquier request que mande el access token de Auth0 (como hace el
    // frontend en getAgencias()) recibe 401: Strapi intenta validar ese
    // token como su propio JWT nativo (no lo es) y lo rechaza ANTES de
    // llegar a evaluar permisos de rol — no cae a "Public" por default.
    // Bug real observado en vivo: dropdown de agencias vacío en
    // "Agregar Socio" para cualquier usuario con sesión iniciada.
    find: { auth: false, policies: ['global::allow-public-relations'] },
    findOne: { auth: false, policies: ['global::allow-public-relations'] },
  },
});

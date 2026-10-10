'use strict';

/**
 * Rutas personalizadas del expediente del vehículo.
 *
 * Strapi 4 solo publica las rutas CRUD desde createCoreRouter; los métodos
 * custom del controller (getCard) NO se exponen sin declarar su ruta aquí.
 * Este archivo las registra:
 *   - GET /vehicle/card/:id            → vehicle.getCard (is-verificador)
 *   - POST /vehicles/:id/open-review   → vehicle.openReview (is-verificador)
 *   - POST /vehicles/:id/close-review  → vehicle.closeReview (is-verificador)
 *
 * Todas usan auth:false + policy Auth0 custom porque el frontend envía
 * tokens de Auth0, no JWT nativo de Strapi (mismo patrón que agencia).
 */
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/vehicle/card/:id',
      handler: 'vehicle.getCard',
      config: {
        auth: false,
        policies: ['global::is-verificador'],
      },
    },
    {
      method: 'POST',
      path: '/vehicles/:id/open-review',
      handler: 'vehicle.openReview',
      config: {
        auth: false,
        policies: ['global::is-verificador'],
      },
    },
    {
      method: 'POST',
      path: '/vehicles/:id/close-review',
      handler: 'vehicle.closeReview',
      config: {
        auth: false,
        policies: ['global::is-verificador'],
      },
    },
  ],
};

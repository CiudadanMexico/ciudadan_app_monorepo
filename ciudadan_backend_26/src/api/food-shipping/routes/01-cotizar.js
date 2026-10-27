'use strict';

/**
 * Operación de cotización de envío para Food (MVP checkout).
 *
 * POST /api/food-shipping/cotizar
 * auth: false + global::is-authenticated-auth0 (identidad SIEMPRE del token
 * Auth0; el usuario del body se ignora por completo).
 */
module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/food-shipping/cotizar',
      handler: 'food-shipping.cotizar',
      config: {
        auth: false,
        policies: ['global::is-authenticated-auth0'],
      },
    },
  ],
};

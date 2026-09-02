'use strict';

/**
 * Rutas custom para anuncios remunerados.
 * Archivo numerado (01-) para que se cargue antes que ad.js (core router)
 * y registre los endpoints públicos de /ver-anuncios.
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/ads/publicitarios',
      handler: 'ad.findPublicitarios',
      config: {
        auth: false,
        policies: ['global::is-authenticated-auth0'],
      },
    },
  ],
};
'use strict';

/**
 * Ruta custom: GET /api/agencias/mi-agencia/socios
 * Lista los miembros actuales de la agencia propia de quien hace la
 * petición. Requiere Auth0 + rol admin/socio.
 */
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/agencias/mi-agencia/socios',
      handler: 'miembros-agencia.miembrosAgencia',
      config: {
        auth: false,
        policies: ['global::is-admin-or-socio'],
      },
    },
  ],
};

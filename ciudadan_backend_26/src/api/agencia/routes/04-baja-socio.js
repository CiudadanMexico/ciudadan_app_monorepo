'use strict';

/**
 * Ruta custom: POST /api/agencias/mi-agencia/socios/:userId/baja
 * Quita a un usuario de la agencia propia de quien hace la petición.
 * Requiere Auth0 + rol admin/socio.
 */
module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/agencias/mi-agencia/socios/:userId/baja',
      handler: 'baja-socio.bajaSocio',
      config: {
        auth: false,
        policies: ['global::is-admin-or-socio'],
      },
    },
  ],
};

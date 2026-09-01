'use strict';

/**
 * Ruta custom: GET /api/agencias/mi-agencia/socios/buscar?q=...
 * Busca usuarios sin agencia por email/username, para agregarlos.
 * Requiere Auth0 + rol admin/socio.
 */
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/agencias/mi-agencia/socios/buscar',
      handler: 'buscar-socios.buscarSocios',
      config: {
        auth: false,
        policies: ['global::is-admin-or-socio'],
      },
    },
  ],
};

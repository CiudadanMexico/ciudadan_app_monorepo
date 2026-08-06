'use strict';

/**
 * Ruta custom: POST /api/agencias/:id/socios
 * Da de alta un socio como miembro de una agencia.
 * Requiere Auth0 + rol admin/socio.
 */
module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/agencias/:id/socios',
      handler: 'agregar-socio.agregarSocio',
      config: {
        auth: false,
        policies: ['global::is-admin-or-socio'],
      },
    },
  ],
};

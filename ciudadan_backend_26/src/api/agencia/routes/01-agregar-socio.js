'use strict';

/**
 * Ruta custom: POST /api/agencias/mi-agencia/socios
 * Da de alta un socio como miembro de la agencia propia de quien hace la
 * petición (ya no recibe el id de agencia por parámetro).
 * Requiere Auth0 + rol admin/socio.
 */
module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/agencias/mi-agencia/socios',
      handler: 'agregar-socio.agregarSocio',
      config: {
        auth: false,
        policies: ['global::is-admin-or-socio'],
      },
    },
  ],
};

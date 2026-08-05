'use strict';

/**
 * Route: POST /tareas/apelar
 * Permite a un socio apelar una calificación baja (score <= 3).
 * Requiere Auth0 + rol admin o socio.
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/tareas/apelar',
      handler: 'apelar.apelar',
      config: {
        auth: false,
        policies: ['global::is-authenticated-auth0', 'global::is-admin-or-socio'],
      },
    },
  ],
};

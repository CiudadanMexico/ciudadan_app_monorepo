'use strict';

/**
 * Route: GET /tareas/filtrar
 * Listado de tareas con filtros por estado, usuario, agencia y todo.
 * Requiere autenticación Auth0 (cualquier usuario logueado).
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/tareas/filtrar',
      handler: 'find-filtered.findFiltered',
      config: {
        auth: false,
        policies: ['global::is-authenticated-auth0'],
      },
    },
  ],
};

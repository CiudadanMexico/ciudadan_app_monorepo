'use strict';

/**
 * Ruta custom: GET /api/agendas/conductores-pendientes
 * Lista conductores pendientes de verificar, filtrados por agencia matriz.
 * Requiere Auth0 + rol admin/socio/verificador.
 */
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/agendas/conductores-pendientes',
      handler: 'conductores-pendientes.conductoresPendientes',
      config: {
        auth: false,
        policies: ['global::is-admin-or-socio-or-verificador'],
      },
    },
  ],
};

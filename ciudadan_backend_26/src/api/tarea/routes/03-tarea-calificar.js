'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/tareas/calificar',
      handler: 'calificar.calificar',
      config: {
        auth: false,
        // can-calificar-tarea ya valida autenticación (Auth0 /userinfo) Y
        // permisos por tipo de tarea + tipo de agencia, así que reemplaza a
        // is-authenticated-auth0 + is-admin-or-socio para este endpoint.
        policies: ['global::can-calificar-tarea'],
      },
    },
  ],
};

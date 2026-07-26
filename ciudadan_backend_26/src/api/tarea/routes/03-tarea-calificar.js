'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/tareas/calificar',
      handler: 'calificar.calificar',
      config: {
        auth: false,
        policies: ['global::is-authenticated-auth0', 'global::is-admin-or-socio'],
      },
    },
  ],
};

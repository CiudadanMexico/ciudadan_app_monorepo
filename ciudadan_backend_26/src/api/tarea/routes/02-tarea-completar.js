'use strict';

module.exports = {
  routes: [
    {
      method: 'PUT',
      path: '/tareas/completar',
      handler: 'completar.completar',
      config: {
        auth: false,
        policies: ['global::is-authenticated-auth0'],
      },
    },
  ],
};

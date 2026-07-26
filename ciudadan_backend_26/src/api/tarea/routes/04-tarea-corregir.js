'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/tareas/corregir',
      handler: 'corregir.corregir',
      config: {
        auth: false,
        policies: ['global::is-authenticated-auth0', 'global::is-verificador'],
      },
    },
  ],
};

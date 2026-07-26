'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/tareas/resolver',
      handler: 'resolver.resolver',
      config: {
        auth: false,
        policies: ['global::is-authenticated-auth0'],
      },
    },
  ],
};

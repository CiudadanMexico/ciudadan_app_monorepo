'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/cartera',
      handler: 'cartera.find',
      config: {
        auth: false,
        policies: ['global::is-authenticated-auth0'],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/cartera/:id',
      handler: 'cartera.findOne',
      config: {
        auth: false,
        policies: ['global::is-authenticated-auth0'],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/cartera',
      handler: 'cartera.create',
      config: {
        auth: false,
        policies: ['global::is-authenticated-auth0'],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/cartera/:id',
      handler: 'cartera.update',
      config: {
        auth: false,
        policies: ['global::is-authenticated-auth0', 'global::is-admin-or-socio'],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/cartera/:id',
      handler: 'cartera.delete',
      config: {
        auth: false,
        policies: ['global::is-authenticated-auth0', 'global::is-admin-or-socio'],
        middlewares: [],
      },
    },
  ],
};

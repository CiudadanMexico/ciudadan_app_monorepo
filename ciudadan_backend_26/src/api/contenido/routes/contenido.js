'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/contenidos',
      handler: 'contenido.find',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/contenidos/:id',
      handler: 'contenido.findOne',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/contenidos',
      handler: 'contenido.create',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/contenidos/:id',
      handler: 'contenido.update',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/contenidos/:id',
      handler: 'contenido.delete',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};

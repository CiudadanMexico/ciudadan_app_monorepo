// /src/api/store/routes/store.js

'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/stores/finalize-stripe',
      handler: 'store.finalizeStripeOnboarding',
      config: {
        policies: [],
        auth: false, // o true si quieres proteger con auth
      },
    },

    {
      method: 'GET',
      path: '/stores',
      handler: 'store.find',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/stores/:id',
      handler: 'store.findOne',
      config: {
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/stores',
      handler: 'store.create',
      config: {
        policies: [],
      },
    },
    {
      method: 'PUT',
      path: '/stores/:id',
      handler: 'store.update',
      config: {
        policies: [],
      },
    },
    {
      method: 'DELETE',
      path: '/stores/:id',
      handler: 'store.delete',
      config: {
        policies: [],
      },
    },
  ],
};

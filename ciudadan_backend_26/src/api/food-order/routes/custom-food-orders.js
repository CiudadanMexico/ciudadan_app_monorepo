'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/food-orders/mine',
      handler: 'food-order.mine',
      config: {
        auth: false,
        policies: ['global::is-authenticated-auth0'],
      },
    },
    {
      method: 'POST',
      path: '/food-orders/:id/verify-payment',
      handler: 'food-order.verifyPayment',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
'use strict';

module.exports = {
  routes: [
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
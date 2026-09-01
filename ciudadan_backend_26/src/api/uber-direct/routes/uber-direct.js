"use strict";

module.exports = {
  routes: [
    {
      method: "POST",
      path: "/uber-direct/quote",
      handler: "uber-direct.quote",
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/uber-direct/deliveries',
      handler: 'uber-direct.createDelivery',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
  ],
};
"use strict";

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/logistics-transactions",
      handler: "logistics-transaction.find",
      config: {
        auth: false,
        policies: [
          "global::is-authenticated-auth0",
        ],
      },
    },

    {
      method: "GET",
      path: "/logistics-transactions/:id",
      handler: "logistics-transaction.findOne",
      config: {
        auth: false,
        policies: [
          "global::is-authenticated-auth0",
        ],
      },
    },
  ],
};
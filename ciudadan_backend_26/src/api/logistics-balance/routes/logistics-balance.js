"use strict";

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/logistics-balance/me",
      handler: "logistics-balance.getMyBalance",
      config: {
        auth: false,
        policies: ['global::is-authenticated-auth0']
      },
    },

    {
      method: "POST",
      path: "/logistics-balance/deposits",
      handler: "logistics-balance.createDeposit",
      config: {
        auth: false,
        policies: ['global::is-authenticated-auth0']
      },
    },

    {
      method: "GET",
      path: "/logistics-balance/deposits",
      handler: "logistics-balance.getDeposits",
      config: {
        auth: false,
        policies: ['global::is-authenticated-auth0']
      },
    },

    {
      method: "GET",
      path: "/logistics-balance/balances",
      handler: "logistics-balance.getAllBalances",
      config: {
        auth: false,
        policies: ['global::is-authenticated-auth0']
      },
    },

    {
      method: "POST",
      path: "/logistics-balance/deposits/:id/approve",
      handler: "logistics-balance.approveDeposit",
      config: {
        auth: false,
        policies: ['global::is-authenticated-auth0']
      },
    },

    {
      method: "POST",
      path: "/logistics-balance/deposits/:id/reject",
      handler: "logistics-balance.rejectDeposit",
      config: {
        auth: false,
        policies: ['global::is-authenticated-auth0']
      },
    },
  ],
};
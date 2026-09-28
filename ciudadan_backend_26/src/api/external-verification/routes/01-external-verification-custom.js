'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/cars-validations/:id/external-verifications',
      handler: 'external-verification.register',
      config: {
        policies: ['global::is-verificador'],
        middlewares: [],
      },
    },
  ],
};

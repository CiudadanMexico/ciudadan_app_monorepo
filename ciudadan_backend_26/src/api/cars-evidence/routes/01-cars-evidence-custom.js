'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/cars-validations/:id/evidences',
      handler: 'cars-evidence.upload',
      config: {
        policies: ['global::is-verificador'],
        middlewares: [],
      },
    },
    {
      method: 'PATCH',
      path: '/cars-evidences/:id/review',
      handler: 'cars-evidence.updateReview',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};

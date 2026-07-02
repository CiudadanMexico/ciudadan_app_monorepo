'use strict';

module.exports = {
  routes: [
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

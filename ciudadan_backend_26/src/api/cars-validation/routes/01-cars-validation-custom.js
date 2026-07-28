'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/cars-validations/from-agenda',
      handler: 'cars-validation.createFromAgenda',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/cars-validations/resubmission-context',
      handler: 'cars-validation.getResubmissionContext',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/cars-validations/resolve',
      handler: 'cars-validation.resolveByAgenda',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/cars-validations/:id/review-bundle',
      handler: 'cars-validation.getReviewBundle',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PATCH',
      path: '/cars-validations/:id/observations',
      handler: 'cars-validation.updateObservations',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PATCH',
      path: '/cars-validations/:id/checklist',
      handler: 'cars-validation.updateChecklist',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/cars-validations/:id/complete',
      handler: 'cars-validation.complete',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/cars-validations/sync-from-driver',
      handler: 'cars-validation.syncFromDriver',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};

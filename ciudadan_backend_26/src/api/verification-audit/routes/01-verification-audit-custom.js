'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/cars-validations/:id/audits',
      handler: 'verification-audit.createForValidation',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/verification-audits/:id/result',
      handler: 'verification-audit.submitResult',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/verification-audits/collusion-signals',
      handler: 'verification-audit.collusionSignals',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};

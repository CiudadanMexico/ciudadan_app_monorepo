'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/verification-audits/:id/items',
      handler: 'verification-audit-item.submit',
      config: {
        policies: ['global::is-auditor'],
        middlewares: [],
      },
    },
  ],
};

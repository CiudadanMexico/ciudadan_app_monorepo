'use strict';

module.exports = {
  routes: [{
    method: 'POST',
    path: '/submit',
    handler: 'generation-application.submit',
    config: {
      auth: false,
      policies: ['global::try-auth0-user'],
    },
  }],
};

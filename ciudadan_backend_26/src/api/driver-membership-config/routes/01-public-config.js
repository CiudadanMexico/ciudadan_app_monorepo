'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/driver-membership/public-config',
      handler: 'public-config.getPublicConfig',
      config: { auth: false },
    },
  ],
};

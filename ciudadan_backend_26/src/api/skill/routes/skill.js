'use strict';

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::skill.skill', {
  config: {
    create: { auth: false, policies: ['global::is-authenticated-auth0'] },
    update: { auth: false, policies: ['global::is-authenticated-auth0'] },
    delete: { auth: false, policies: ['global::is-authenticated-auth0'] },
  },
});

'use strict';

module.exports = async (ctx, config, { strapi }) => {
  const middleware = require('../middlewares/auth0jwt/index')(config, { strapi });
  await middleware(ctx, async () => {}); // Ejecuta el middleware y sigue
};

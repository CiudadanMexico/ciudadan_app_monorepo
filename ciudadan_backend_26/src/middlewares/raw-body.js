'use strict';

const getRawBody = require('raw-body');

module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    // Solo interceptar si el path es exactamente /api/stripe/webhook y es POST
    if (ctx.request.path === '/api/stripe/webhook' && ctx.request.method === 'POST') {
      try {
        const rawBody = await getRawBody(ctx.req, {
          length: ctx.request.length,
          limit: '2mb',
          encoding: ctx.request.charset || 'utf-8',
        });
        ctx.request.body = rawBody;
      } catch (err) {
        ctx.throw(400, `Unable to parse raw body: ${err.message}`);
      }
    }
    // Si no es esa ruta, simplemente continuar sin tocar el body
    await next();
  };
};

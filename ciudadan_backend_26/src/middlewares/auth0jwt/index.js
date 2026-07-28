'use strict';

const jwt = require('jsonwebtoken');
const jwksRsa = require('jwks-rsa');

module.exports = (config, { strapi }) => {
  console.log('iniciaaaaaaaaaaaaaando')
  const DOMAIN   = process.env.AUTH0_DOMAIN;    // ej: 'ciudadan.us.auth0.com'
  const AUDIENCE = process.env.AUTH0_AUDIENCE;  // ej: 'marihuanasclub'
  const ISSUER   = `https://${DOMAIN}/`;
  const JWKS_URI = `${ISSUER}.well-known/jwks.json`;

  const client = jwksRsa({
    jwksUri: JWKS_URI,
    cache: true,
    rateLimit: true,
  });

  const getKey = (header, cb) => {
    console.log('iniciando autenticacion')
    client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        strapi.log.error('🔑 Error getting signing key:', err);
        return cb(err);
      }
      cb(null, key.getPublicKey());
    });
  };

  return async (ctx, next) => {
    const authHeader = ctx.request.headers.authorization || '';

    if (!authHeader.startsWith('Bearer ')) {
      console.log('iniciando')
      return ctx.unauthorized('No token provided');
    }

    const token = authHeader.slice(7);

    try {
      const decoded = await new Promise((resolve, reject) => {
        jwt.verify(
          token,
          getKey,
          {
            audience: AUDIENCE,
            issuer: ISSUER,
            algorithms: ['RS256'],
          },
          (err, payload) => (err ? reject(err) : resolve(payload))
        );
      });

      ctx.state.user = decoded;
      await next();
    } catch (err) {
      strapi.log.error('❌ JWT verification failed:', err.message || err);
      return ctx.unauthorized('Invalid or expired token');
    }
  };
};

// path: src/api/auth/controllers/auth.js

'use strict';

const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const client = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

// Lee el Bearer token del header `Authorization`. Como fallback, acepta
// `access_token` en el body para retrocompatibilidad con clientes que aún
// no usen el header (e.g. apps nativas viejas).
function extractAccessToken(ctx) {
  const header = ctx.request.header?.authorization || ctx.request.headers?.authorization;
  if (header && /^Bearer\s+/i.test(header)) {
    return header.replace(/^Bearer\s+/i, '').trim();
  }
  return ctx.request.body?.access_token || null;
}

module.exports = {
  async auth0Login(ctx) {
    try {
      const access_token = extractAccessToken(ctx);
      const bodyEmail = ctx.request.body?.email;

      if (!access_token) {
        return ctx.badRequest('Missing access token');
      }

      // Verificar el JWT con las claves públicas de Auth0 (JWKS)
      const payload = await new Promise((resolve, reject) => {
        jwt.verify(access_token, getKey, {
          audience: process.env.AUTH0_AUDIENCE,
          issuer: `https://${process.env.AUTH0_DOMAIN}/`,
          algorithms: ['RS256'],
        }, (err, decoded) => {
          if (err) reject(err);
          else resolve(decoded);
        });
      });

      const auth0Id = payload.sub;
      // El access_token de API no incluye email; usar el email del body o
      // los claims de Auth0 (namespace claim configurado en Auth0).
      const email = bodyEmail || payload.email || payload['https://ciudadan.org/email'];

      if (!email) {
        return ctx.badRequest('No email provided');
      }

      // Buscar si el usuario ya existe
      const existingUsers = await strapi.entityService.findMany('plugin::users-permissions.user', {
        filters: { email },
        populate: ['role'],
      });

      let user = existingUsers[0];

      if (!user) {
        // Obtener el rol por defecto
        const defaultRole = await strapi.db.query('plugin::users-permissions.role').findOne({
          where: { type: 'authenticated' },
        });

        if (!defaultRole) {
          throw new Error('No default authenticated role found');
        }

        user = await strapi.entityService.create('plugin::users-permissions.user', {
          data: {
            email,
            username: email,
            provider: 'auth0',
            confirmed: true,
            role: defaultRole.id,
          },
        });
      }

      // Generar token JWT de Strapi
      const token = strapi.plugins['users-permissions'].services.jwt.issue({
        id: user.id,
      });

      // Sesión por cookie: `secure` según entorno. En prod (HTTPS) la cookie
      // va solo sobre conexiones cifradas; en dev (HTTP local) puede ser false
      // para que el navegador la acepte. Se controla con NODE_ENV o un flag
      // explícito. Por defecto se asume producción (más seguro).
      const isProd = process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false';

      ctx.cookies.set('token', token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        path: '/',
        maxAge: 1000 * 60 * 60 * 24, // 1 día
      });

      ctx.send({
        jwt: token,
        user,
      });

    } catch (err) {
      strapi.log.error('auth0Login: verificación Auth0 fallida', err);
      return ctx.unauthorized('Auth0 verification failed');
    }
  },
};

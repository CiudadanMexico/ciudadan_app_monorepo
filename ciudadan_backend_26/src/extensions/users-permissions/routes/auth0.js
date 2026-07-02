'use strict';

const axios = require('axios');

module.exports = {
  async callback(ctx) {
    const { id_token } = ctx.query;

    if (!id_token) {
      return ctx.badRequest('Missing id_token');
    }

    try {
      // Traemos las variables del env para Auth0
      const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;       // ej: 'ciudadan.auth0.com'
      const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID; // tu client id
      const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;   // el audience configurado

      if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID || !AUTH0_AUDIENCE) {
        return ctx.internalServerError('Auth0 environment variables missing');
      }

      // Validar el token si quieres (aquí solo hacemos request a userinfo)
      const { data: userInfo } = await axios.get(`https://${AUTH0_DOMAIN}/userinfo`, {
        headers: {
          Authorization: `Bearer ${id_token}`,
        },
      });

      const {
        email,
        name,
        nickname,
        picture,
        sub, // user id de Auth0
        updated_at,
        locale,
      } = userInfo;

      if (!email) {
        return ctx.badRequest('Email is required');
      }

      // Buscar o crear usuario en Strapi
      let user = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { email },
      });

      if (!user) {
        user = await strapi.db.query('plugin::users-permissions.user').create({
          data: {
            email,
            username: nickname || name || email,
            confirmed: true,
            provider: 'auth0',
            // puedes guardar más info en campos personalizados
            // auth0_id: sub,
            // picture,
            // locale,
          },
        });
      } else {
        // Actualizar info (opcional)
        await strapi.db.query('plugin::users-permissions.user').update({
          where: { id: user.id },
          data: {
            username: nickname || name || email,
            // picture,
            // locale,
          },
        });
      }

      // Generar JWT de Strapi
      const jwt = strapi.plugin('users-permissions').service('jwt').issue({ id: user.id });

      ctx.send({
        jwt,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          provider: user.provider,
          confirmed: user.confirmed,
          picture: user.picture || picture,
          locale: user.locale || locale,
          auth0_id: user.auth0_id || sub,
          updated_at,
        },
      });

    } catch (error) {
      strapi.log.error('Auth0 callback error:', error);
      ctx.internalServerError('Authentication Failed');
    }
  },
};

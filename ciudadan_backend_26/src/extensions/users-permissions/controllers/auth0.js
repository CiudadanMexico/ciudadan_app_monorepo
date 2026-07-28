// src/extensions/users-permissions/controllers/auth0.js
'use strict';

const axios = require('axios');

module.exports = {
  async callback(ctx) {
    const { id_token } = ctx.query;

    if (!id_token) {
      return ctx.badRequest('Missing id_token');
    }

    try {
      // Validar token y obtener info de usuario en Auth0
      const userInfo = await axios.get('https://ciudadan.auth0.com/userinfo', {
        headers: {
          Authorization: `Bearer ${id_token}`,
        },
      });

      const { email, name } = userInfo.data;

      if (!email) {
        return ctx.badRequest('Email is required');
      }

      // Buscar usuario existente o crear nuevo
      const existingUser = await strapi.query('plugin::users-permissions.user').findOne({
        where: { email },
      });

      let user;
      if (existingUser) {
        user = existingUser;
      } else {
        user = await strapi.query('plugin::users-permissions.user').create({
          data: {
            email,
            username: name || email,
            confirmed: true,
            provider: 'auth0',
          },
        });
      }

      // Generar JWT Strapi
      const token = strapi.plugin('users-permissions').service('jwt').issue({ id: user.id });

      ctx.send({
        jwt: token,
        user,
      });

    } catch (err) {
      console.error('Auth0 callback error:', err.response?.data || err.message || err);
      ctx.internalServerError('Authentication Failed');
    }
  },
};

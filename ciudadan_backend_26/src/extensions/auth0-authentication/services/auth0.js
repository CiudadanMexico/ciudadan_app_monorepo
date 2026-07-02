'use strict';
const axios = require('axios');
const { getService } = require('@strapi/plugin-users-permissions/server/utils');

module.exports = {
  async auth0Login(ctx) {
    const { access_token } = ctx.request.body;

    if (!access_token) {
      return ctx.badRequest('access_token requerido');
    }

    try {
      // 1. Obtener perfil del usuario desde Auth0
      const profileRes = await axios.get('https://ciudadadan.us.auth0.com/userinfo', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      const { email, sub } = profileRes.data;

      strapi.log.info(`📧 Email desde Auth0: ${email}`);
      strapi.log.info(`🆔 Auth0 sub: ${sub}`);

      // 2. Buscar usuario en Strapi
      let existingUsers = await strapi.entityService.findMany('plugin::users-permissions.user', {
        filters: { email },
        populate: ['role'],
      });

      let user;

      if (existingUsers.length > 0) {
        strapi.log.info(`👤 Usuario existente encontrado: ${existingUsers[0].id}`);
        user = existingUsers[0];
      } else {
        strapi.log.info('🆕 Usuario no existe. Creando nuevo usuario...');

        // Segunda verificación para evitar creación duplicada en concurrencia
        existingUsers = await strapi.entityService.findMany('plugin::users-permissions.user', {
          filters: { email },
          populate: ['role'],
        });

        if (existingUsers.length > 0) {
          strapi.log.info(`⚠️ Usuario fue creado entre verificaciones: ${existingUsers[0].id}`);
          user = existingUsers[0];
        } else {
          // 3. Obtener el rol por defecto (Authenticated)
          const defaultRole = await strapi.query('plugin::users-permissions.role').findOne({
            where: { type: 'authenticated' },
          });

          // 4. Crear usuario
          user = await strapi.entityService.create('plugin::users-permissions.user', {
            data: {
              username: email,
              email,
              provider: 'auth0',
              confirmed: true,
              blocked: false,
              role: defaultRole?.id ?? 1,
            },
          });

          strapi.log.info(`✅ Usuario creado: ${JSON.stringify(user)}`);
        }
      }

      // 5. Generar y establecer cookie httpOnly con el plugin
      const token = getService('jwt').issue({ id: user.id });

      ctx.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        path: '/',
      });

      return ctx.send({
        jwt: token,
        user,
      });
    } catch (err) {
      strapi.log.error('❌ Error en auth0Login:', err.message || err);
      return ctx.internalServerError('Error al autenticar con Auth0');
    }
  },
};

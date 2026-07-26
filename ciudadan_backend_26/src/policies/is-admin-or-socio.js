'use strict';

const axios = require('axios');

const ROLES_PERMITIDOS = ['admin', 'socio'];

/**
 * Permite continuar solo si el usuario autenticado (via Auth0) tiene
 * 'admin' o 'socio' en su campo roles.extra dentro de Strapi.
 * Valida el access_token de Auth0 contra /userinfo (mismo patrón que
 * ya existía, a medias, en extensions/users-permissions/controllers/auth0.js).
 */
module.exports = async (ctx, config, { strapi }) => {
  const authHeader = ctx.request.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    strapi.log.warn('is-admin-or-socio: falta el header Authorization');
    return false;
  }

  const token = authHeader.slice(7);
  const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;

  if (!AUTH0_DOMAIN) {
    strapi.log.error('is-admin-or-socio: falta AUTH0_DOMAIN en el .env');
    return false;
  }

  let email;
  try {
    const { data } = await axios.get(`https://${AUTH0_DOMAIN}/userinfo`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    email = data.email;
  } catch (err) {
    strapi.log.warn('is-admin-or-socio: token inválido en Auth0', err.response?.data || err.message);
    return false;
  }

  if (!email) {
    strapi.log.warn('is-admin-or-socio: Auth0 no devolvió email');
    return false;
  }

  const user = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { email },
  });

  if (!user) {
    strapi.log.warn(`is-admin-or-socio: no existe usuario en Strapi con email ${email}`);
    return false;
  }

  const extra = Array.isArray(user.roles?.extra) ? user.roles.extra : [];
  const roleName = user.role?.name || user.role?.type || user.role?.code || null;
  const tienePermiso = extra.some((rol) => ROLES_PERMITIDOS.includes(rol)) || ROLES_PERMITIDOS.includes(roleName);

  if (!tienePermiso) {
    strapi.log.warn(`is-admin-or-socio: usuario ${email} no tiene admin/socio`);
    return false;
  }

  ctx.state.strapiUser = user;
  return true;
};

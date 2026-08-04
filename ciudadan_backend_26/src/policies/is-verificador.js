'use strict';

const { getAuth0Email } = require('../utils/auth0-verify');

const ROLES_PERMITIDOS = ['admin', 'verificador'];

/**
 * Permite continuar solo si el usuario autenticado (via Auth0) tiene
 * 'admin' o 'verificador' en su campo roles.extra dentro de Strapi.
 * Pensada para el flujo de verificación de áreas (PUT /users/:id con
 * area_details) donde el verificador es el actor principal.
 */
module.exports = async (ctx, config, { strapi }) => {
  const authHeader = ctx.request.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    strapi.log.warn('is-verificador: falta el header Authorization');
    return false;
  }

  const token = authHeader.slice(7);

  let email;
  try {
    email = await getAuth0Email(token, { strapi });
  } catch (err) {
    strapi.log.warn('is-verificador: token inválido en Auth0', err.response?.data || err.message);
    return false;
  }

  const user = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { email },
  });

  if (!user) {
    strapi.log.warn(`is-verificador: no existe usuario en Strapi con email ${email}`);
    return false;
  }

  const extra = Array.isArray(user.roles?.extra) ? user.roles.extra : [];
  const roleName = user.role?.name || user.role?.type || user.role?.code || null;
  const tienePermiso = extra.some((rol) => ROLES_PERMITIDOS.includes(rol)) || ROLES_PERMITIDOS.includes(roleName);

  if (!tienePermiso) {
    strapi.log.warn(`is-verificador: usuario ${email} no tiene admin/verificador`);
    return false;
  }

  ctx.state.strapiUser = user;
  return true;
};

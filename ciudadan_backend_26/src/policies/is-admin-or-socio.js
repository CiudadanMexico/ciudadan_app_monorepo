'use strict';

const { getAuth0Email } = require('../utils/auth0-verify');

const ROLES_PERMITIDOS = ['admin', 'socio'];

/**
 * Permite continuar solo si el usuario autenticado (via Auth0) tiene
 * 'admin' o 'socio' en su campo roles.extra dentro de Strapi.
 * Valida el access_token de Auth0 contra /userinfo (mismo patrón que
 * ya existía, a medias, en extensions/users-permissions/controllers/auth0.js).
 *
 * IMPORTANTE (peculiaridad verificada de Strapi 4.25 — compose-endpoint.js):
 * el middleware `authorize` envuelve a las policies en un try/catch y
 * convierte TODO ForbiddenError en `ctx.forbidden()` SIN mensaje (siempre
 * respondería "Forbidden" genérico). Como `PolicyError` hereda de
 * ForbiddenError, tampoco sirve lanzar eso ni devolver `false`. Por eso aquí
 * se lanza un Error plano con `status = 403`: `authorize` lo reenvía intacto
 * y el middleware de errores lo formatea con el motivo (`details` en el body).
 */
const rechazar403 = (motivo) => {
  const error = new Error(motivo);
  error.name = 'ForbiddenError'; // forma compatible, sin heredar la clase
  error.status = 403;
  error.expose = true;
  throw error;
};

module.exports = async (ctx, config, { strapi }) => {
  const authHeader = ctx.request.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    strapi.log.warn('is-admin-or-socio: falta el header Authorization');
    rechazar403('Sin cabecera Authorization: inicia sesión para continuar.');
  }

  const token = authHeader.slice(7);

  let email;
  try {
    email = await getAuth0Email(token, { strapi });
  } catch (err) {
    strapi.log.warn('is-admin-or-socio: token inválido en Auth0', err.response?.data || err.message);
    rechazar403('Tu sesión no es válida o expiró: vuelve a iniciar sesión.');
  }

  const user = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { email },
  });

  if (!user) {
    strapi.log.warn(`is-admin-or-socio: no existe usuario en Strapi con email ${email}`);
    rechazar403('No existe una cuenta de usuario asociada a tu correo.');
  }

  const extra = Array.isArray(user.roles?.extra) ? user.roles.extra : [];
  const roleName = user.role?.name || user.role?.type || user.role?.code || null;
  const tienePermiso = extra.some((rol) => ROLES_PERMITIDOS.includes(rol)) || ROLES_PERMITIDOS.includes(roleName);

  if (!tienePermiso) {
    strapi.log.warn(`is-admin-or-socio: usuario ${email} no tiene admin/socio`);
    rechazar403('Tu cuenta no tiene rol admin/socio para esta acción.');
  }

  ctx.state.strapiUser = user;
  return true;
};

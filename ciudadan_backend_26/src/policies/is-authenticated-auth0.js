'use strict';

const { getAuth0Email } = require('../utils/auth0-verify');

/**
 * Permite continuar si el usuario trae un token de Auth0 válido y existe
 * en Strapi. A diferencia de is-admin-or-socio, NO exige ningún rol extra:
 * cualquier usuario autenticado pasa. Pensada para acciones que cualquier
 * socio puede hacer (ej. resolver/tomar una tarea general).
 *
 * Usa getAuth0Email (utils/auth0-verify.js) que cachea la verificación por
 * token unos segundos — sin esto, ráfagas de requests casi simultáneas con
 * el mismo token (ej. el doble efecto de React.StrictMode en dev) disparan
 * varias llamadas a `/userinfo` de Auth0 al mismo tiempo y Auth0 las
 * rechaza por límite de tasa, viéndose como "token inválido" aunque el
 * token sea perfectamente válido — bug real confirmado en el log del
 * servidor: la misma request exacta respondió 200 y, 200ms después, 403.
 */
module.exports = async (ctx, config, { strapi }) => {
  const authHeader = ctx.request.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    strapi.log.warn('is-authenticated-auth0: falta el header Authorization');
    return false;
  }

  const token = authHeader.slice(7);

  let email;
  try {
    email = await getAuth0Email(token, { strapi });
  } catch (err) {
    strapi.log.warn('is-authenticated-auth0: token inválido en Auth0', err.response?.data || err.message);
    return false;
  }

  const user = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { email },
  });

  if (!user) {
    strapi.log.warn(`is-authenticated-auth0: no existe usuario en Strapi con email ${email}`);
    return false;
  }

  ctx.state.strapiUser = user;
  return true;
};

'use strict';

const { getAuth0Email } = require('../utils/auth0-verify');

// Igual que is-admin-or-socio, pero además admite el rol 'root' (admin
// global). Se usa para gestionar postulaciones a socio: admin/socio ven
// su agencia; root ve todas. Archivo aparte para no alterar is-admin-or-socio
// que reutilizan otros endpoints de agencia.
const ROLES_PERMITIDOS = ['admin', 'socio', 'root'];

const rechazar403 = (motivo) => {
  const error = new Error(motivo);
  error.name = 'ForbiddenError';
  error.status = 403;
  error.expose = true;
  throw error;
};

module.exports = async (ctx, config, { strapi }) => {
  const authHeader = ctx.request.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    strapi.log.warn('is-admin-socio-or-root: falta el header Authorization');
    rechazar403('Sin cabecera Authorization: inicia sesión para continuar.');
  }

  const token = authHeader.slice(7);

  let email;
  try {
    email = await getAuth0Email(token, { strapi });
  } catch (err) {
    strapi.log.warn('is-admin-socio-or-root: token inválido en Auth0', err.response?.data || err.message);
    rechazar403('Tu sesión no es válida o expiró: vuelve a iniciar sesión.');
  }

  const user = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { email },
    populate: { agencia: true },
  });

  if (!user) {
    strapi.log.warn(`is-admin-socio-or-root: no existe usuario en Strapi con email ${email}`);
    rechazar403('No existe una cuenta de usuario asociada a tu correo.');
  }

  const extra = Array.isArray(user.roles?.extra) ? user.roles.extra : [];
  const roleName = user.role?.name || user.role?.type || user.role?.code || null;
  const tienePermiso = extra.some((rol) => ROLES_PERMITIDOS.includes(rol)) || ROLES_PERMITIDOS.includes(roleName);

  if (!tienePermiso) {
    strapi.log.warn(`is-admin-socio-or-root: usuario ${email} no tiene admin/socio/root`);
    rechazar403('Tu cuenta no tiene rol admin/socio para esta acción.');
  }

  ctx.state.strapiUser = user;
  return true;
};

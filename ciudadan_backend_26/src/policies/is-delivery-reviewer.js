'use strict';

/**
 * Policy is-delivery-reviewer (MVP repartidores, spec §8/§12C):
 * token Auth0 valido + usuario Strapi con rol socio|admin|root, con su
 * agencia populada para que el controlador verifique ambito (misma agencia
 * del expediente), vigencia del socio y no-auto-aprobacion.
 *
 * Derivada de is-admin-socio-or-root (mismo patron de roles + populate), en
 * archivo aparte para no alterar las policies existentes (precedente
 * is-auditor.js:5-8). El chequeo FINO de ambito/vigencia vive en
 * api::delivery-registration/services/revision-service (verificarAmbito),
 * porque depende del expediente de cada request.
 */

const { getAuth0Email } = require('../utils/auth0-verify');

const ROLES_PERMITIDOS = ['socio', 'admin', 'root'];

// Strapi 4.25 traga los ForbiddenError de policies (is-admin-or-socio.js:13-19):
// Error plano con status 403 conserva el motivo para el cliente.
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
    strapi.log.warn('is-delivery-reviewer: falta el header Authorization');
    rechazar403('Sin cabecera Authorization: inicia sesion para continuar.');
  }

  const token = authHeader.slice(7);

  let email;
  try {
    email = await getAuth0Email(token, { strapi });
  } catch (err) {
    strapi.log.warn('is-delivery-reviewer: token invalido en Auth0', err.response?.data || err.message);
    rechazar403('Tu sesion no es valida o expiro: vuelve a iniciar sesion.');
  }

  const user = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { email },
    populate: { agencia: true },
  });

  if (!user) {
    strapi.log.warn(`is-delivery-reviewer: no existe usuario en Strapi con email ${email}`);
    rechazar403('No existe una cuenta de usuario asociada a tu correo.');
  }

  const extra = Array.isArray(user.roles?.extra) ? user.roles.extra : [];
  const roleName = user.role?.name || user.role?.type || user.role?.code || null;
  const tienePermiso =
    extra.some((rol) => ROLES_PERMITIDOS.includes(rol)) || ROLES_PERMITIDOS.includes(roleName);

  if (!tienePermiso) {
    strapi.log.warn(`is-delivery-reviewer: usuario ${email} sin rol socio/admin/root`);
    rechazar403('Tu cuenta no tiene permiso de revision de repartidores (socio/admin/root).');
  }

  ctx.state.strapiUser = user;
  return true;
};

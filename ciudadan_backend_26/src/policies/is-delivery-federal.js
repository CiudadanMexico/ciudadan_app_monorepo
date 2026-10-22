'use strict';

/**
 * Policy is-delivery-federal (MVP repartidores, spec §12C):
 * token Auth0 valido + rol socio|admin|root + agencia FEDERAL.
 *
 * El alcance "federal" vigente del repositorio es agencia.tipo === 'federal'
 * (can-asignar-tarea.js:126-155, can-calificar-tarea.js:113-162: federal opera
 * TODA la red). No existe jerarquia parent (auditoria Fase A §1.2), asi que
 * la bandeja federal ve casos de todas las agencias, que es exactamente el
 * alcance "subordinado" real. El rol root tiene bypass global (misma matriz
 * que postulacion-socio).
 */

const { getAuth0Email } = require('../utils/auth0-verify');

const ROLES_PERMITIDOS = ['socio', 'admin', 'root'];

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
    rechazar403('Sin cabecera Authorization: inicia sesion para continuar.');
  }

  const token = authHeader.slice(7);

  let email;
  try {
    email = await getAuth0Email(token, { strapi });
  } catch (err) {
    strapi.log.warn('is-delivery-federal: token invalido en Auth0', err.response?.data || err.message);
    rechazar403('Tu sesion no es valida o expiro: vuelve a iniciar sesion.');
  }

  const user = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { email },
    populate: { agencia: true },
  });

  if (!user) {
    rechazar403('No existe una cuenta de usuario asociada a tu correo.');
  }

  const extra = Array.isArray(user.roles?.extra) ? user.roles.extra : [];
  const roleName = user.role?.name || user.role?.type || user.role?.code || null;
  const tieneRol =
    extra.some((rol) => ROLES_PERMITIDOS.includes(rol)) || ROLES_PERMITIDOS.includes(roleName);
  const esRoot = extra.includes('root');

  if (!tieneRol) {
    rechazar403('Tu cuenta no tiene permiso para la bandeja federal (socio/admin/root).');
  }

  const tipoAgencia = user.agencia?.tipo || null;
  if (!esRoot && tipoAgencia !== 'federal') {
    rechazar403('La bandeja federal es solo para miembros de una agencia federal.');
  }

  ctx.state.strapiUser = user;
  return true;
};

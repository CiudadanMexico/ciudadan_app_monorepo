'use strict';

// extensions/users-permissions/utils/escritura-protegida.js
// Reglas de autorizacion para escritura de usuarios (revision fase 1 esfericulos
// + fase 2 del sistema de Ciudadan). Autenticacion (Auth0 valido, policy
// is-authenticated-auth0) != autorizacion: estas reglas deciden QUE puede
// escribir cada llamador sobre roles y estados protegidos.
//
// Regla acordada (2026-10-05):
//   - Solo roles.extra 'admin' administra roles y estados protegidos.
//     Ser socio NO concede administracion (el flujo agregar-socio de agencias
//     usa db.query directo y su propia policy is-admin-or-socio: no pasa por aqui).
//   - Editar un perfil CONSERVA los roles legitimos del objetivo: quien no es
//     admin solo puede anadir roles de autoservicio ('pasajero', lo que
//     RegistroPasajero envia de verdad) y no puede quitar roles existentes.
//   - Borrar otros usuarios exige autorizacion administrativa (roles.extra
//     'admin'); cualquier autenticado normal recibe 403.
//
// La EVIDENCIA (tiempo/porcentaje observado, roles vigentes) nunca se
// sobreescribe en silencio: todo filtrado deja warn en el log de Strapi.

const ROLES_AUTOSERVICIO = ['pasajero'];
const ROL_ESTANDAR_AUTENTICADO = 1;   // up_roles: 1=Authenticated, 2=Public
const CAMPOS_PROTEGIDOS_ESCRITURA = [
  'verificado', 'membresia_vigente', 'tipo_membresia', 'fecha_membresia',
  'fecha_fin_membresia_actual', 'registrado', 'curado',
  'esperandocofepris', 'foliocofepris', 'esperandoamparo', 'tipoamparo',
  'amparostatus', 'status_legal',
  'id_stripe', 'stripeCustomerId', 'stripeSubscriptionId', 'stripePriceId',
  'subscriptionStatus', 'openpayid', 'openpaykey',
];

function extraDe(user) {
  const roles = user && user.roles;
  return Array.isArray(roles && roles.extra) ? roles.extra : [];
}

/** Autorizacion administrativa: solo roles.extra 'admin'. */
function esAdminDeStrapi(user) {
  return extraDe(user).includes('admin');
}

function interseccionAutoservicio(enviados) {
  if (!Array.isArray(enviados)) return [];
  return enviados.filter((r) => ROLES_AUTOSERVICIO.includes(r));
}

function limpiarObjeto(body, tocados) {
  for (const campo of CAMPOS_PROTEGIDOS_ESCRITURA) {
    if (body[campo] !== undefined) { delete body[campo]; tocados.push(campo); }
  }
  if (body.role !== undefined && Number(body.role) !== ROL_ESTANDAR_AUTENTICADO) {
    tocados.push(`role:${body.role}`);
    body.role = ROL_ESTANDAR_AUTENTICADO;
  }
  // anidamiento data (algunos flujos del FE envuelven el payload asi)
  if (body.data && typeof body.data === 'object' && !Array.isArray(body.data)) {
    for (const campo of CAMPOS_PROTEGIDOS_ESCRITURA) {
      if (body.data[campo] !== undefined) { delete body.data[campo]; tocados.push(`data.${campo}`); }
    }
    if (body.data.role !== undefined && Number(body.data.role) !== ROL_ESTANDAR_AUTENTICADO) {
      tocados.push(`data.role:${body.data.role}`);
      body.data.role = ROL_ESTANDAR_AUTENTICADO;
    }
    if (body.data.roles !== undefined) {
      body.data.roles = { extra: interseccionAutoservicio(body.data.roles && body.data.roles.extra) };
      tocados.push('data.roles');
    }
  }
}

/**
 * Creacion / registro (rutas publicas o sin sesion admin):
 * sin roles previos que conservar; roles final = enviados ∩ autoservicio
 * (o ['pasajero'] si no queda nada). Estados protegidos: eliminados.
 */
function prepararCreacion(body) {
  const tocados = [];
  if (!body || typeof body !== 'object') return tocados;
  limpiarObjeto(body, tocados);
  if (body.roles !== undefined) {
    const extra = interseccionAutoservicio(body.roles && body.roles.extra);
    body.roles = { extra: extra.length ? extra : [...ROLES_AUTOSERVICIO] };
    tocados.push('roles');
  }
  return tocados;
}

/**
 * Edicion de perfil (PUT /api/users/:id): conserva los roles legitimos del
 * objetivo. roles final = actuales ∪ (enviados ∩ autoservicio). Quien no es
 * admin no puede quitar roles existentes ni anadir privilegiados.
 */
function prepararEdicion(body, rolesActuales) {
  const tocados = [];
  if (!body || typeof body !== 'object') return tocados;
  limpiarObjeto(body, tocados);
  const actuales = extraDe({ roles: rolesActuales });
  const fusion = (enviados) => {
    const suma = [...new Set([...actuales, ...interseccionAutoservicio(enviados)])];
    return { extra: suma };
  };
  if (body.roles !== undefined) {
    body.roles = fusion(body.roles && body.roles.extra);
    tocados.push('roles');
  }
  if (body.data && typeof body.data === 'object' && body.data.roles !== undefined) {
    body.data.roles = fusion(body.data.roles && body.data.roles.extra);
    tocados.push('data.roles');
  }
  return tocados;
}

/** DELETE /api/users/:id exige autorizacion administrativa. */
function puedeEliminar(user) {
  return esAdminDeStrapi(user);
}

module.exports = {
  ROLES_AUTOSERVICIO,
  CAMPOS_PROTEGIDOS_ESCRITURA,
  esAdminDeStrapi,
  prepararCreacion,
  prepararEdicion,
  puedeEliminar,
};

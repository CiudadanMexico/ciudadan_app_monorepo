'use strict';

const { getAuth0Email } = require('../utils/auth0-verify');

/**
 * Policy: try-auth0-user (auth opcional)
 *
 * BUG REAL ENCONTRADO Y CORREGIDO: las rutas find/findOne de `todo` son
 * públicas (auth:false + allow-public-relations) para que un visitante sin
 * sesión pueda ver las tareas generales (spec: regla de visibilidad #1).
 * Pero como NINGUNA policy de esas rutas llenaba `ctx.state.strapiUser`
 * (solo lo hace `is-authenticated-auth0`, que estas rutas no usan porque
 * bloquearía a los visitantes), el controller `todo.js` SIEMPRE veía
 * `user = undefined` — sin importar si la request traía un token Auth0
 * válido o no. Resultado: `buildTodoVisibilityFilter` trataba a TODOS los
 * llamantes (visitante, usuario verificado, socio, admin) como anónimos y
 * forzaba `nivel: {$in: ['general','becario','becarios']}` siempre — las
 * tareas 'especialidad'/'experto'/'personalizada' eran inalcanzables para
 * CUALQUIERA (verificado con pruebas reales: ni un especialista verificado
 * ni la pantalla de Asignar Tarea podían verlas/asignarlas).
 *
 * Esta policy identifica al usuario SI trae un token Auth0 válido, pero a
 * diferencia de is-authenticated-auth0 nunca bloquea la request — un
 * visitante sin token (o con token inválido) sigue pasando sin
 * `ctx.state.strapiUser`, y el controller lo trata como anónimo (solo
 * generales), tal como pide la spec.
 */
module.exports = async (ctx, config, { strapi }) => {
  const authHeader = ctx.request.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return true;

  const token = authHeader.slice(7);

  try {
    const email = await getAuth0Email(token, { strapi });
    const user = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { email },
    });
    if (user) ctx.state.strapiUser = user;
  } catch {
    // Token ausente/inválido/expirado: seguir como visitante, no bloquear.
  }

  return true;
};

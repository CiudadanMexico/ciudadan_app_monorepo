'use strict';

/**
 * Rutas de notificaciones autenticadas con Auth0.
 *
 * Se usa el patrón del repo (ver routes/03-tarea-calificar.js):
 *   auth: false  +  policies: ['global::is-authenticated-auth0']
 * La policy valida el Bearer token contra Auth0 y deja el usuario de Strapi en
 * `ctx.state.strapiUser`. Así no dependemos de los permisos del rol público
 * (que hoy NO tienen ningún permiso de `notificacion`, motivo por el que
 * GET /api/notificaciones devolvía 403 y el sistema no funcionaba).
 *
 * Las rutas core (routes/notificacion.js) se conservan intactas para no romper
 * compatibilidad.
 */

const AUTH0 = 'global::is-authenticated-auth0';

/** Config compartida: objeto nuevo por ruta para no compartir referencias. */
const auth0Config = () => ({ auth: false, policies: [AUTH0] });

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/notificaciones/me',
      handler: 'notificacion.me',
      config: auth0Config(),
    },
    {
      method: 'GET',
      path: '/notificaciones/mine',
      handler: 'notificacion.mine',
      config: auth0Config(),
    },
    {
      method: 'GET',
      path: '/notificaciones/mine/:id',
      handler: 'notificacion.mineOne',
      config: auth0Config(),
    },
    {
      method: 'POST',
      path: '/notificaciones/send',
      handler: 'notificacion.send',
      config: auth0Config(),
    },
    {
      method: 'PUT',
      path: '/notificaciones/:id/read',
      handler: 'notificacion.markRead',
      config: auth0Config(),
    },
    {
      method: 'POST',
      path: '/notificaciones/mark-all-read',
      handler: 'notificacion.markAllRead',
      config: auth0Config(),
    },
  ],
};

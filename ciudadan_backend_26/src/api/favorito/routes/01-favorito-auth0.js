'use strict';

/**
 * Rutas de favoritos autenticadas con Auth0.
 *
 * Patrón del repo (ver routes/01-notificacion-auth0.js):
 *   auth: false  +  policies: ['global::is-authenticated-auth0']
 * La policy valida el Bearer token contra Auth0 y deja el usuario de Strapi en
 * `ctx.state.strapiUser`. Así no dependemos de los permisos del rol público
 * (que NO tienen ningún permiso de `favorito`, motivo del 401
 * "Missing or invalid credentials").
 *
 * Las rutas core (routes/favorito.js) se conservan intactas para no romper
 * compatibilidad.
 */

const AUTH0 = 'global::is-authenticated-auth0';

/** Config compartida: objeto nuevo por ruta para no compartir referencias. */
const auth0Config = () => ({ auth: false, policies: [AUTH0] });

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/favoritos/mine',
      handler: 'favorito.mine',
      config: auth0Config(),
    },
    {
      method: 'GET',
      path: '/favoritos/check',
      handler: 'favorito.check',
      config: auth0Config(),
    },
    {
      method: 'POST',
      path: '/favoritos/toggle',
      handler: 'favorito.toggle',
      config: auth0Config(),
    },
    {
      method: 'DELETE',
      path: '/favoritos/:id',
      handler: 'favorito.remove',
      config: auth0Config(),
    },
  ],
};

'use strict';

/**
 * Rutas custom de SESIONES de anuncios remunerados.
 *
 * ⚠️ Viven en el api `ad` (y no en `ad-session`) porque Strapi 4 monta las
 * rutas custom bajo /api/<pluralName-del-api>: aquí se registran como
 * /api/ads/sesiones/..., que es lo que consume el frontend.
 *
 * Los handlers referencian el controller de ad-session con su UID completo
 * (api::ad-session.ad-session.<metodo>), formato soportado por Strapi 4.
 * Todos usan auth:false + la política global::is-authenticated-auth0
 * (valida el Bearer token de Auth0 y setea ctx.state.strapiUser).
 * El token de sesión viaja en el header X-Ad-Token.
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/sesiones/:id',
      handler: 'api::ad-session.ad-session.getSesion',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'POST',
      path: '/sesiones',
      handler: 'api::ad-session.ad-session.iniciarSesion',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'POST',
      path: '/sesiones/:id/heartbeat',
      handler: 'api::ad-session.ad-session.heartbeat',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'POST',
      path: '/sesiones/:id/anuncios/:itemId/estado',
      handler: 'api::ad-session.ad-session.cambiarEstado',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'POST',
      path: '/sesiones/:id/anuncios/:itemId/completar',
      handler: 'api::ad-session.ad-session.completarAnuncio',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'POST',
      path: '/sesiones/:id/refill',
      handler: 'api::ad-session.ad-session.refill',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },
  ],
};

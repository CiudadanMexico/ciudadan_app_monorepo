'use strict';

/**
 * Rutas custom de SESIONES de anuncios remunerados.
 *
 * ⚠️ En Strapi 4 las rutas custom se montan en /api + el `path` EXACTO
 * (el plural del api NO se antepone automáticamente; así lo hace también
 * 03-tarea-calificar.js con '/tareas/calificar' → /api/tareas/calificar).
 * Por eso los paths incluyen el prefijo /ads manualmente.
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
      path: '/ads/sesiones/:id',
      handler: 'api::ad-session.ad-session.getSesion',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'POST',
      path: '/ads/sesiones',
      handler: 'api::ad-session.ad-session.iniciarSesion',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'POST',
      path: '/ads/sesiones/:id/heartbeat',
      handler: 'api::ad-session.ad-session.heartbeat',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'POST',
      path: '/ads/sesiones/:id/anuncios/:itemId/estado',
      handler: 'api::ad-session.ad-session.cambiarEstado',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'POST',
      path: '/ads/sesiones/:id/anuncios/:itemId/completar',
      handler: 'api::ad-session.ad-session.completarAnuncio',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'POST',
      path: '/ads/sesiones/:id/refill',
      handler: 'api::ad-session.ad-session.refill',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },
  ],
};

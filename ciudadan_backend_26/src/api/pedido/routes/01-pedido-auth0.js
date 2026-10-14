'use strict';

/**
 * Rutas de pedidos autenticadas con Auth0 (patrón del repo:
 * ver routes/01-favorito-auth0.js).
 *
 * auth: false + policies: ['global::is-authenticated-auth0']
 * La policy valida el Bearer token contra Auth0 y deja el usuario de Strapi
 * en `ctx.state.strapiUser`. Así no dependemos de los permisos del rol
 * público sobre `pedido` (que NO los tiene, motivo del 401
 * "Missing or invalid credentials" en la pantalla "Tus Compras").
 *
 * Los handlers filtran server-side por el usuario autenticado (relation
 * `usuario` y fallback `metadata.usuario_email`, que es donde el checkout
 * actual guarda al dueño), sin confiar en el email que mande el cliente.
 *
 * Las rutas core (routes/pedido.js) se conservan intactas para no romper
 * compatibilidad.
 */

const AUTH0 = 'global::is-authenticated-auth0';

/** Config compartida: objeto nuevo por ruta para no compartir referencias. */
const auth0Config = () => ({ auth: false, policies: [AUTH0] });

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/pedidos/mine',
      handler: 'pedido.mine',
      config: auth0Config(),
    },
    {
      method: 'GET',
      path: '/pedidos/by-id/:id',
      handler: 'pedido.byId',
      config: auth0Config(),
    },
    {
      method: 'GET',
      path: '/pedidos/store-mine',
      handler: 'pedido.storeMine',
      config: auth0Config(),
    },
  ],
};

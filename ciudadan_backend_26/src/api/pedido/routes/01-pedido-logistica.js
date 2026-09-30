'use strict';

/**
 * Rutas logísticas del pedido (Fase 2 — refactorización Marketplace).
 *
 * - POST /pedidos/:id/shipping-quote  → congela el snapshot de la tarifa seleccionada en checkout.
 * - POST /pedidos/:id/preparar-envio  → el vendedor define los paquetes físicos reales.
 *
 * Siguen el patrón del marketplace actual: auth:false + try-auth0-user
 * (el frontend de marketplace no envía token; la validación de ownership
 * se aplica cuando el usuario sí está identificado).
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/pedidos/:id/shipping-quote',
      handler: 'pedido.saveShippingQuote',
      config: {
        auth: false,
        policies: ['global::try-auth0-user'],
      },
    },
    {
      method: 'POST',
      path: '/pedidos/:id/preparar-envio',
      handler: 'pedido.prepararEnvio',
      config: {
        auth: false,
        policies: ['global::try-auth0-user'],
      },
    },
  ],
};

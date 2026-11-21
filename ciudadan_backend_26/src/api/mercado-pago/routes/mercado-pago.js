'use strict';

/**
 * Rutas custom de MERCADO PAGO.
 * Montadas bajo /api/mercado-pago/
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/mercado-pago/preference',
      handler: 'api::mercado-pago.mercado-pago.createPreference',
      config: { policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'POST',
      path: '/mercado-pago/preapproval',
      handler: 'api::mercado-pago.mercado-pago.createPreapproval',
      config: { policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'POST',
      path: '/mercado-pago/webhook',
      handler: 'api::mercado-pago.mercado-pago.webhook',
      config: { auth: false }, // Webhook público
    },
    {
      method: 'GET',
      path: '/mercado-pago/payment/:id',
      handler: 'api::mercado-pago.mercado-pago.getPayment',
      config: { policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'GET',
      path: '/mercado-pago/preapproval/:id',
      handler: 'api::mercado-pago.mercado-pago.getPreapproval',
      config: { policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'DELETE',
      path: '/mercado-pago/preapproval/:id',
      handler: 'api::mercado-pago.mercado-pago.cancelPreapproval',
      config: { policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'GET',
      path: '/mercado-pago/payments/search',
      handler: 'api::mercado-pago.mercado-pago.searchPayments',
      config: { policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'GET',
      path: '/mercado-pago/preapprovals/search',
      handler: 'api::mercado-pago.mercado-pago.searchPreapprovals',
      config: { policies: ['global::is-authenticated-auth0'] },
    },
  ],
};
'use strict';

/**
 * Rutas custom de COMMISSION PAYMENT (pago de comisiones).
 * Montadas bajo /api/commission-payments/
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/commission-payments/me/pending',
      handler: 'api::commission-payment.commission-payment.myPending',
      config: { policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'GET',
      path: '/commission-payments/me/paid',
      handler: 'api::commission-payment.commission-payment.myPaid',
      config: { policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'POST',
      path: '/commission-payments/admin/mark-paid',
      handler: 'api::commission-payment.commission-payment.markPaid',
      config: { policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'GET',
      path: '/commission-payments/admin/summary',
      handler: 'api::commission-payment.commission-payment.summary',
      config: { policies: ['global::is-authenticated-auth0'] },
    },
  ],
};
'use strict';

/**
 * Rutas custom de STATE PARTNER (Socios Estatales).
 * Montadas bajo /api/state-partner/
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/state-partner/apply',
      handler: 'api::state-partner.state-partner.apply',
      config: { policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'GET',
      path: '/state-partner/me',
      handler: 'api::state-partner.state-partner.me',
      config: { policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'GET',
      path: '/state-partner/by-state/:state',
      handler: 'api::state-partner.state-partner.byState',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/state-partner/entry-fee/preference',
      handler: 'api::state-partner.state-partner.createEntryFeePreference',
      config: { policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'POST',
      path: '/state-partner/entry-fee/preapproval',
      handler: 'api::state-partner.state-partner.createEntryFeePreapproval',
      config: { policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'POST',
      path: '/state-partner/entry-fee/pay',
      handler: 'api::state-partner.state-partner.payEntryFee',
      config: { policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'POST',
      path: '/state-partner/webhook/mercadopago',
      handler: 'api::state-partner.state-partner.mercadopagoWebhook',
      config: { auth: false },
    },
  ],
};
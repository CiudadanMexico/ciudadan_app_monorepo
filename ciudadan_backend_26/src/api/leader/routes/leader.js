'use strict';

/**
 * Rutas custom de LEADER (Líderes Verificadores).
 * Montadas bajo /api/leader/
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/apply',
      handler: 'api::leader.leader.apply',
      config: { policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'GET',
      path: '/me',
      handler: 'api::leader.leader.me',
      config: { policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'POST',
      path: '/kit/preference',
      handler: 'api::leader.leader.createKitPreference',
      config: { policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'POST',
      path: '/kit/purchase',
      handler: 'api::leader.leader.purchaseKit',
      config: { policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'GET',
      path: '/verify/:referralCode',
      handler: 'api::leader.leader.verifyReferral',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/webhook/mercadopago',
      handler: 'api::leader.leader.mercadopagoWebhook',
      config: { auth: false },
    },
  ],
};
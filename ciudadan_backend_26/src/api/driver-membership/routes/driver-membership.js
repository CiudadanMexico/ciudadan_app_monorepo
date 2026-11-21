'use strict';

/**
 * Rutas custom de DRIVER MEMBERSHIP (membresía de conductores).
 * Montadas bajo /api/driver-membership/
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/driver-membership/create',
      handler: 'api::driver-membership.driver-membership.create',
      config: { policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'GET',
      path: '/driver-membership/me',
      handler: 'api::driver-membership.driver-membership.me',
      config: { policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'POST',
      path: '/driver-membership/preference',
      handler: 'api::driver-membership.driver-membership.createPreference',
      config: { policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'POST',
      path: '/driver-membership/preapproval',
      handler: 'api::driver-membership.driver-membership.createPreapproval',
      config: { policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'POST',
      path: '/driver-membership/cancel',
      handler: 'api::driver-membership.driver-membership.cancel',
      config: { policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'POST',
      path: '/driver-membership/webhook/mercadopago',
      handler: 'api::driver-membership.driver-membership.mercadopagoWebhook',
      config: { auth: false },
    },
  ],
};
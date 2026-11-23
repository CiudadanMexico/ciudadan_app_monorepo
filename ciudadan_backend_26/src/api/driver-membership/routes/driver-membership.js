'use strict';

/**
 * Rutas custom de DRIVER MEMBERSHIP (membresía de conductores).
 * Montadas bajo /api/driver-membership/
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/create',
      handler: 'api::driver-membership.driver-membership.create',
      config: { policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'GET',
      path: '/me',
      handler: 'api::driver-membership.driver-membership.me',
      config: { policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'POST',
      path: '/preference',
      handler: 'api::driver-membership.driver-membership.createPreference',
      config: { policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'POST',
      path: '/preapproval',
      handler: 'api::driver-membership.driver-membership.createPreapproval',
      config: { policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'POST',
      path: '/cancel',
      handler: 'api::driver-membership.driver-membership.cancel',
      config: { policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'POST',
      path: '/webhook/mercadopago',
      handler: 'api::driver-membership.driver-membership.mercadopagoWebhook',
      config: { auth: false },
    },
  ],
};
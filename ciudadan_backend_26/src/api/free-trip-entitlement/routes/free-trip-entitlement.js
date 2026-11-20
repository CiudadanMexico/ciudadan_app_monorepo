'use strict';

/**
 * Rutas custom de FREE TRIP ENTITLEMENT (viajes gratis para pasajeros).
 * Montadas bajo /api/free-trips/
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/free-trips/qr-scan',
      handler: 'api::free-trip-entitlement.free-trip-entitlement.qrScan',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'GET',
      path: '/free-trips/status',
      handler: 'api::free-trip-entitlement.free-trip-entitlement.status',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'POST',
      path: '/free-trips/apply',
      handler: 'api::free-trip-entitlement.free-trip-entitlement.apply',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'GET',
      path: '/free-trips/check/:viajeId',
      handler: 'api::free-trip-entitlement.free-trip-entitlement.checkForTrip',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },
  ],
};
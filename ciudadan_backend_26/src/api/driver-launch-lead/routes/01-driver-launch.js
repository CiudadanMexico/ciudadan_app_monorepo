'use strict';

/**
 * Rutas públicas de la landing de descarga de conductores.
 * `auth: false` porque la landing no requiere sesión: la promoción se protege
 * con Turnstile (POST) y con un token criptográfico de un solo uso (descarga).
 */
module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/driver-launch/claim',
      handler: 'driver-launch.claim',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/driver-launch/notify',
      handler: 'driver-launch.notify',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/driver-launch/download/:token',
      handler: 'driver-launch.download',
      config: { auth: false },
    },
  ],
};

'use strict';

/**
 * Ruta custom pública: GET /api/driver-verifier/public-config
 *
 * Expone SOLO la configuración que necesita la landing de Líderes
 * Verificadores (días del reto, referidos requeridos y URL del grupo de
 * WhatsApp). Nunca expone el single type `site-setting` completo.
 */
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/driver-verifier/public-config',
      handler: 'public-config.getPublicConfig',
      config: {
        auth: false,
      },
    },
  ],
};
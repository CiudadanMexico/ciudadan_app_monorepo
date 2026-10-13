'use strict';

/**
 * Ruta custom pública: GET /api/wiki/public-config
 *
 * Expone SOLO la ruta física de los .md de la wiki (`wikis_path` del single
 * type `site-setting`), que el socket-service necesita para el watcher y la
 * indexación. Nunca expone el resto de la configuración global.
 */
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/wiki/public-config',
      handler: 'wiki.getPublicConfig',
      config: {
        auth: false,
      },
    },
  ],
};

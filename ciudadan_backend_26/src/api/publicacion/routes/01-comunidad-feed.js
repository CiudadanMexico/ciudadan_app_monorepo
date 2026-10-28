'use strict';

/**
 * Ruta custom pública: GET /api/comunidades/publicaciones
 *
 * Feed real de la sección Comunidad del frontend (ruta /comunidades y
 * /comunidad/feed). Lee el content-type `publicacion`
 * (api::publicacion.publicacion) con strapi.entityService.
 *
 * ¿Por qué una ruta custom y no el core router de Strapi?
 *   - El rol público de users-permissions NO tiene el permiso `find` sobre
 *     `publicacion` (y no debe tenerlo: el feed solo debe exponer posts ya
 *     publicados, nunca borradores ni posts bloqueados/eliminados).
 *   - La ruta filtra por `publicado = 'publicado'` + `publicationState: live`,
 *     de modo que el feed es público por diseño sin abrir permisos globales.
 *
 * Patrón del proyecto (ver src/api/site-setting/routes/01-wiki.js y
 * src/api/driver-membership-config/routes/01-public-config.js):
 *   - archivo con prefijo numérico → se registra antes que el core router;
 *   - `auth: false` → lectura pública, sin sesión ni token.
 */
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/comunidades/publicaciones',
      handler: 'comunidad-feed.listar',
      config: { auth: false },
    },
  ],
};

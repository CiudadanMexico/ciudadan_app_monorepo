'use strict';

/**
 * Override de la subida de archivos (plugin upload) para que acepte el token
 * Auth0 de la app en vez del JWT secreto de Strapi.
 *
 * BUG: subir un PDF desde la vista de habilidades (TareasEspecializadas.jsx)
 * respondía `401 Missing or invalid credentials`. Motivo: `POST /api/upload`
 * es una ruta content-api del plugin upload y, sin override, Strapi la
 * autentica con SU propio JWT — el Bearer Auth0 que manda la app no lo
 * valida → 401. Verificado en frío contra la instancia:
 *   - sin Authorization           → 403 Forbidden (el rol Public no tiene
 *                                    permiso de upload: no existe ni la fila)
 *   - con Bearer no-Strapi        → 401 Missing or invalid credentials
 * Es exactamente el mismo caso que ya se resolvió para `/api/users` en
 * `src/extensions/users-permissions/strapi-server.js` (ver comentario ahí):
 * "cualquier GET /api/users con Bearer Auth0 recibía 401 porque el plugin
 * validaba con su propio JWT".
 *
 * La policy `is-authenticated-auth0` (src/policies/) verifica el token contra
 * Auth0 con caché, exige que exista el usuario en Strapi y deja el usuario en
 * `ctx.state.strapiUser`. Con `auth: false` Strapi no aplica ni su JWT ni el
 * chequeo de permisos del rol (que en esta instancia está sin otorgar); el
 * anonimato queda cortado por la propia policy, que lanza 403 si no hay
 * header o el token no es válido.
 *
 * No tocamos GET/DELETE `/files`: la app no consulta el listado de media
 * (grep 'upload/files' en el frontend → 0 usos).
 */
module.exports = function extendUploadPlugin(plugin) {
  const contentApi = plugin?.routes?.['content-api'];
  if (!contentApi || !Array.isArray(contentApi.routes)) return plugin;

  const routes = contentApi.routes;
  const uploadRoute = routes.find((r) => r.method === 'POST' && r.path === '/');
  // NADA de `prefix` aquí: en una ruta NATIVA del plugin un prefix: '' la
  // sacaba de /api/upload y el endpoint respondía 405 Method Not Allowed
  // (regresión detectada con la primera versión de este fichero). En
  // users-permissions, prefix: '' sólo se usa al empujar rutas nuevas.
  const config = {
    auth: false,
    policies: ['global::is-authenticated-auth0'],
  };

  if (uploadRoute) {
    // Conserva el handler original (content-api.upload) y cualquier config que
    // Strapi hubiera puesto; sólo pisa auth/policies.
    uploadRoute.config = { ...(uploadRoute.config || {}), ...config };
  } else {
    // Defensa: si una versión futura cambia las rutas declaradas, registramos
    // la nuestra para que el override no desaparezca en silencio.
    routes.push({
      method: 'POST',
      path: '/',
      handler: 'content-api.upload',
      config: { ...config, prefix: '' },
    });
  }

  return plugin;
};

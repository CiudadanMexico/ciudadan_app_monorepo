'use strict';

/**
 * Ruta custom: GET /api/todos/mi-agencia
 *
 * Tareas publicadas por el socio autenticado dentro de su agencia (TodoToken).
 * Sigue la convención del proyecto (ver src/api/tarea/routes/05-tarea-find-filtered.js
 * y src/api/agencia/routes/03-miembros-agencia.js):
 *   - `auth: false` + policy global::is-authenticated-auth0 (Auth0).
 *   - La policy deja el usuario real en `ctx.state.strapiUser`; el controller
 *     NUNCA lee la identidad desde el query string.
 *
 * El prefijo numérico del archivo mantiene la carga alfabética del proyecto y
 * asegura que esta ruta se registre antes que el `findOne` del core router
 * (/todos/:id), igual que /tareas/filtrar.
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/todos/mi-agencia',
      handler: 'mis-publicadas.misPublicadas',
      config: {
        auth: false,
        policies: ['global::is-authenticated-auth0'],
      },
    },
  ],
};

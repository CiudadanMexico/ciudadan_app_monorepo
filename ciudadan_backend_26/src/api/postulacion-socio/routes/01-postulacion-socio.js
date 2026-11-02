'use strict';

/**
 * postulacion-socio router
 *
 * POST /api/postulacion-socios es PÚBLICO (auth:false): el formulario de
 * /candidatos lo llena gente sin cuenta. Sin esto, el POST público del core
 * router exige permisos de rol que no existen y responde 403.
 *
 * `allow-public-relations` deja `ctx.state.auth` con una estrategia mínima
 * (sin `verify`) para que el saneado de Strapi no descarte en silencio las
 * relaciones `area`/`agencia` cuando la ruta es pública (auth:false).
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/postulacion-socios',
      handler: 'postulacion-socio.crearPublica',
      config: {
        auth: false,
        policies: ['global::allow-public-relations'],
      },
    },
    {
      method: 'GET',
      path: '/postulacion-socios/mi-agencia',
      handler: 'postulacion-socio.miAgencia',
      config: {
        // La policy is-admin-socio-or-root valida el token Auth0 y el rol
        // por su cuenta; sin `auth: false` el router exigía además el JWT
        // de users-permissions y respondía 401 antes de llegar a la policy.
        auth: false,
        policies: ['global::is-admin-socio-or-root'],
      },
    },
    {
      method: 'PATCH',
      path: '/postulacion-socios/:id/estado',
      handler: 'postulacion-socio.resolver',
      config: {
        auth: false,
        policies: ['global::is-admin-socio-or-root'],
      },
    },
  ],
};

// createCoreRouter queda disponible por si se necesitan las rutas core luego.
void createCoreRouter;

'use strict';

/**
 * Route: POST /tareas/subir-evidencia
 * Sube archivos (evidencias) a una tarea y los registra en media + validaciones.
 * Requiere Auth0 + rol admin, socio o verificador.
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/tareas/subir-evidencia',
      handler: 'subir-evidencia.subirEvidencia',
      config: {
        auth: false,
        policies: ['global::is-authenticated-auth0', 'global::is-admin-or-socio-or-verificador'],
      },
    },
  ],
};

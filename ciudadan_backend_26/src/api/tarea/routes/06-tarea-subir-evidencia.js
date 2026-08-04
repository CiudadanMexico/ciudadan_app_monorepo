'use strict';

/**
 * Route: POST /tareas/subir-evidencia
 * Sube archivos (evidencias) a una tarea y los registra en media + validaciones.
 *
 * Requiere Auth0 + estar autenticado — la autorización fina (dueño de la
 * tarea, o admin/socio/verificador con área que coincide) vive en el
 * controller, no aquí. Antes exigía `is-admin-or-socio-or-verificador` a
 * nivel de ruta, lo que bloqueaba a cualquier usuario normal subiendo
 * evidencia de SU PROPIA tarea al entregarla — el caso de uso más común
 * (bug real: nadie podía adjuntar archivos/enlaces al completar una tarea).
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/tareas/subir-evidencia',
      handler: 'subir-evidencia.subirEvidencia',
      config: {
        auth: false,
        policies: ['global::is-authenticated-auth0'],
      },
    },
  ],
};

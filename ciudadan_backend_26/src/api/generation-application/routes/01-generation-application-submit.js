'use strict';

/**
 * Ruta pública del registro común. En Strapi 4 las rutas custom de un API se
 * montan bajo /api (patrón del código base: tarea declara '/tareas/calificar'),
 * por lo que el path se declara completo: /api/generation-applications/submit
 */
module.exports = {
  routes: [{
    method: 'POST',
    path: '/generation-applications/submit',
    handler: 'generation-application.submit',
    config: {
      auth: false,
      policies: ['global::try-auth0-user'],
    },
  }],
};


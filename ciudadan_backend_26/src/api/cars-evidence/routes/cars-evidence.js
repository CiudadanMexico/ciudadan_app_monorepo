'use strict';

/**
 * cars-evidence router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

// docs/TAXIS-VERIFICACION-CONDUCTORES-FASES.md, Fase 8: "no permitir delete
// de evidencia histórica desde el frontend" — se deshabilita la ruta core
// por completo (no depende de que el toggle de permisos del panel de admin
// se quede correctamente apagado). El versionado (version/is_current/
// supersedes, Fase 1) ya es el mecanismo para "reemplazar" evidencia sin
// borrar nada.
module.exports = createCoreRouter('api::cars-evidence.cars-evidence', {
  config: {
    delete: { enabled: false },
  },
});

'use strict';

/**
 * postulacion-socio router
 *
 * POST /api/postulacion-socios es PÚBLICO (auth:false): el formulario de
 * /candidatos lo llena gente sin cuenta. Sin esto, el POST público del core
 * router exige permisos de rol que no existen y responde 403.
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/postulacion-socios',
      handler: 'postulacion-socio.create',
      config: { auth: false },
    },
  ],
};

// createCoreRouter queda disponible por si se necesitan las rutas core luego.
void createCoreRouter;

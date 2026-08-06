'use strict';

/**
 * Fix D — Rutas formales de verificación de área.
 *
 * Política: `global::is-verificador` → solo admin/verificador pueden marcar
 * `area_details.status = verified` (o `pending`/`rejected`).
 *
 * - POST /areas/verificar-area            → marcar estado de verificación de un área para un usuario
 * - GET  /areas/verificaciones?userId=...  → listar verificaciones actuales del usuario
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/areas/verificar-area',
      handler: 'verificar-area.verificarArea',
      config: {
        auth: false,
        policies: ['global::is-verificador'],
      },
    },
    {
      method: 'GET',
      path: '/areas/verificaciones',
      handler: 'verificar-area.listarVerificaciones',
      config: {
        auth: false,
        policies: ['global::is-verificador'],
      },
    },
  ],
};

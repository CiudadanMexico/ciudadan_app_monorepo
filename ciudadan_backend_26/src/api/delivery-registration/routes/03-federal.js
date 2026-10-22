'use strict';

/**
 * Rutas FEDERALES (MVP repartidores, spec §12C/§12G): bandeja de casos con
 * senales de riesgo ALTA y resolucion auditada. Policy: is-delivery-federal
 * (agencia federal o root). El federal NO aprueba por la agencia local.
 */
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/delivery-registration/federal/cases',
      handler: 'federal.casos',
      config: { auth: false, policies: ['global::is-delivery-federal'] },
    },
    {
      method: 'POST',
      path: '/delivery-registration/federal/cases/:signalId/resolve',
      handler: 'federal.resolver',
      config: { auth: false, policies: ['global::is-delivery-federal'] },
    },
  ],
};

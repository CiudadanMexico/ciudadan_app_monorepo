'use strict';

/**
 * Rutas de revision de AGENCIA (MVP repartidores).
 * Policy: global::is-delivery-reviewer (socio/admin/root con agencia populada);
 * el ambito fino (misma agencia, vigencia del socio, no-auto-aprobacion) lo
 * aplica revision-service en cada accion (spec §12C).
 */
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/delivery-registration/agency/queue',
      handler: 'revision.cola',
      config: { auth: false, policies: ['global::is-delivery-reviewer'] },
    },
    {
      method: 'GET',
      path: '/delivery-registration/agency/:id',
      handler: 'revision.detalle',
      config: { auth: false, policies: ['global::is-delivery-reviewer'] },
    },
    {
      method: 'GET',
      path: '/delivery-registration/agency/:id/evidence/:fileId',
      handler: 'revision.servirEvidencia',
      config: { auth: false, policies: ['global::is-delivery-reviewer'] },
    },
    {
      method: 'POST',
      path: '/delivery-registration/agency/:id/document-checks',
      handler: 'revision.registrarCotejo',
      config: { auth: false, policies: ['global::is-delivery-reviewer'] },
    },
    {
      method: 'POST',
      path: '/delivery-registration/agency/:id/vehicle-classification',
      handler: 'revision.clasificarVehiculo',
      config: { auth: false, policies: ['global::is-delivery-reviewer'] },
    },
    {
      method: 'POST',
      path: '/delivery-registration/agency/:id/request-corrections',
      handler: 'revision.pedirCorrecciones',
      config: { auth: false, policies: ['global::is-delivery-reviewer'] },
    },
    {
      method: 'POST',
      path: '/delivery-registration/agency/:id/mark-video-eligible',
      handler: 'revision.marcarElegibleVideo',
      config: { auth: false, policies: ['global::is-delivery-reviewer'] },
    },
    {
      method: 'POST',
      path: '/delivery-registration/agency/:id/video-validation',
      handler: 'revision.registrarValidacionZoom',
      config: { auth: false, policies: ['global::is-delivery-reviewer'] },
    },
    {
      method: 'POST',
      path: '/delivery-registration/agency/:id/approve',
      handler: 'revision.aprobar',
      config: { auth: false, policies: ['global::is-delivery-reviewer'] },
    },
    {
      method: 'POST',
      path: '/delivery-registration/agency/:id/reject',
      handler: 'revision.rechazar',
      config: { auth: false, policies: ['global::is-delivery-reviewer'] },
    },
    {
      method: 'POST',
      path: '/delivery-registration/agency/:id/suspend',
      handler: 'revision.suspender',
      config: { auth: false, policies: ['global::is-delivery-reviewer'] },
    },
    {
      method: 'POST',
      path: '/delivery-registration/agency/:id/revalidate',
      handler: 'revision.revalidar',
      config: { auth: false, policies: ['global::is-delivery-reviewer'] },
    },
    {
      method: 'POST',
      path: '/delivery-registration/agency/:id/reopen',
      handler: 'revision.reabrir',
      config: { auth: false, policies: ['global::is-delivery-reviewer'] },
    },
  ],
};

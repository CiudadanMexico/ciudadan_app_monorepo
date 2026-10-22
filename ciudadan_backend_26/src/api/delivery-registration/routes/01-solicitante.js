'use strict';

/**
 * Rutas del solicitante (MVP repartidores). Todas auth:false + policy Auth0:
 * la identidad SIEMPRE sale de ctx.state.strapiUser, nunca del payload.
 *
 * Prefijo: /api/delivery-registration
 */
module.exports = {
  routes: [
    // 1) Cobertura: agencias activas elegibles de la ciudad (MVP: CDMX).
    {
      method: 'GET',
      path: '/delivery-registration/coverage',
      handler: 'coverage.listar',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },

    // 2) Lista de espera (sin cobertura): alta voluntaria con consentimiento.
    {
      method: 'POST',
      path: '/delivery-registration/waitlist',
      handler: 'waitlist.suscribir',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'POST',
      path: '/delivery-registration/waitlist/unsubscribe',
      handler: 'waitlist.baja',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },

    // 3) Expediente: iniciar idempotente (agencia validada server-side).
    {
      method: 'POST',
      path: '/delivery-registration',
      handler: 'expediente.iniciar',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },

    // 4) Consulta del propio expediente (proyeccion sin datos sensibles).
    {
      method: 'GET',
      path: '/delivery-registration/me',
      handler: 'expediente.mi',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },

    // 5) Edicion de campos permitidos en estados editables.
    {
      method: 'PATCH',
      path: '/delivery-registration/me',
      handler: 'expediente.actualizar',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },

    // 6) Enviar a revision tras prechecks server-side de completitud.
    {
      method: 'POST',
      path: '/delivery-registration/me/submit',
      handler: 'expediente.enviar',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },

    // 7) Vehiculo (MVP: uno por expediente, validacion condicional por tipo).
    {
      method: 'POST',
      path: '/delivery-registration/me/vehicles',
      handler: 'vehiculos.registrar',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },

    // 8) Evidencias: adjuntar archivo subido a un slot validado.
    {
      method: 'POST',
      path: '/delivery-registration/me/evidence',
      handler: 'evidencias.adjuntar',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },

    // 9) Evidencias: descarga PRIVADA del titular (streaming, sin URL publica).
    {
      method: 'GET',
      path: '/delivery-registration/me/evidence/:fileId',
      handler: 'evidencias.servir',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },

    // 10) Capacitacion: cuestionario (sin respuestas correctas).
    {
      method: 'GET',
      path: '/delivery-registration/me/training',
      handler: 'capacitacion.cuestionario',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },

    // 11) Capacitacion: presentar examen (calificacion server-side).
    {
      method: 'POST',
      path: '/delivery-registration/me/training',
      handler: 'capacitacion.presentar',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },
  ],
};

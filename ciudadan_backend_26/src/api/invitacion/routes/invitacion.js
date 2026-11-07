'use strict';

/**
 * invitacion router
 *
 * `find` (GET /api/invitaciones) lo consume el frontend (Coowork/AgregarSocio
 * -> `getInvitaciones` de candidatosService.js) con el token de Auth0. Con
 * la config por defecto del core router, Strapi intenta validar ese token
 * como si fuera su propio JWT nativo y responde 401 ANTES de llegar al
 * controlador (mismo bug ya corregido en `src/api/agencia/routes/agencia.js`).
 *
 * Aquí `find` va con `auth: false` + policy `is-admin-socio-or-root`, que
 * valida el token Auth0 y deja al usuario en `ctx.state.strapiUser`. El
 * controlador sobreescrito además acota el listado a la agencia del
 * llamante (root ve todas), para no exponer datos de candidatos de otras
 * agencias.
 *
 * El resto de rutas (findOne/create/update/delete) conservan la auth del
 * core router: las invitaciones las crea el backend al aceptar una
 * postulación, no el frontend.
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::invitacion.invitacion', {
  config: {
    find: { auth: false, policies: ['global::is-admin-socio-or-root'] },
  },
});

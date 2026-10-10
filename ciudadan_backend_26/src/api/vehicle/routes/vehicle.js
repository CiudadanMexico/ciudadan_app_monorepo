'use strict';

/**
 * Router de la colección vehicle.
 *
 * Políticas:
 *   - lectura pública de catálogo: NO (exigimos login/admin),
 *     ver rutas personalizadas inferiores;
 *   - tarjeta de circulación: solo verificadores autorizados
 *     (policy global::is-verificador).
 */
const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::vehicle.vehicle', {
  config: {
    // Listado del expediente: requiere token de Auth0 y se recorta en el
    // controller al usuario/agency del solicitante (nunca catálogo anónimo).
    find: { auth: false, policies: ['global::is-authenticated-auth0'] },
    // Lectura puntual: solo el dueño del expediente o un verificador.
    findOne: { auth: false, policies: ['global::is-authenticated-auth0'] },
  },
});

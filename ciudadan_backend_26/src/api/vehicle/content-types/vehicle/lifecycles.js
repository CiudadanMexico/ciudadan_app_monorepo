'use strict';

/**
 * Lifecycles del expediente del vehículo.
 *
 * Cuando el conductor sube documentación, el servidor —no el cliente— decide
 * si el expediente pasa de `preregistrado` a `documento_completo`. Así el
 * frontend no puede "declarar" un expediente completo sin que los archivos
 * existan realmente en el modelo.
 */
module.exports = {
  async afterCreate(event) {
    try {
      const { result } = event;
      if (!result?.id) return;
      await strapi
        .service('api::vehicle.vehicle')
        .markDocumentsCompleteIfReady(result.id);
    } catch (err) {
      strapi.log.warn('[vehicle.lifecycles] afterCreate:', err.message);
    }
  },

  async afterUpdate(event) {
    try {
      const { result } = event;
      if (!result?.id) return;
      await strapi
        .service('api::vehicle.vehicle')
        .markDocumentsCompleteIfReady(result.id);
    } catch (err) {
      strapi.log.warn('[vehicle.lifecycles] afterUpdate:', err.message);
    }
  },
};

'use strict';

/**
 * viaje service
 *
 * Integración con free-trip-entitlement:
 * - Al crear/concluir un viaje, verifica si el pasajero tiene viaje gratis
 * - Aplica el descuento automáticamente si corresponde
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::viaje.viaje', ({ strapi }) => ({

  /**
   * Verifica y aplica viaje gratis para un pasajero en un viaje
   * @param {number} pasajeroId - ID del usuario pasajero
   * @param {number} viajeId - ID del viaje
   * @param {number} costo - Costo del viaje
   * @returns {Object} Resultado con descuento aplicado
   */
  async applyFreeTripIfAvailable(pasajeroId, viajeId, costo) {
    try {
      const freeTripService = strapi.service('api::free-trip-entitlement.free-trip-entitlement');
      const check = await freeTripService.canApplyFreeTrip(pasajeroId, costo);

      if (!check.canApply) {
        return { applied: false, reason: check.reason };
      }

      // Aplicar el viaje gratis (marcar entitlement como usado)
      const result = await freeTripService.markFreeTripAsUsed(pasajeroId, viajeId);

      if (!result.success) {
        return { applied: false, reason: result.reason };
      }

      const descuento = Math.min(costo, check.maxDiscount);

      return {
        applied: true,
        discount: descuento,
        maxDiscount: check.maxDiscount,
        entitlementId: result.entitlement.id,
        fuente: check.entitlement.fuente,
      };
    } catch (err) {
      strapi.log.error('Error aplicando viaje gratis en viaje:', err);
      return { applied: false, reason: 'ERROR', error: err.message };
    }
  },

  /**
   * Verifica si un viaje puede tener descuento de viaje gratis (sin consumirlo)
   * @param {number} pasajeroId - ID del usuario pasajero
   * @param {number} costo - Costo del viaje
   * @returns {Object} Info del viaje gratis disponible
   */
  async checkFreeTripForTrip(pasajeroId, costo) {
    try {
      const freeTripService = strapi.service('api::free-trip-entitlement.free-trip-entitlement');
      return await freeTripService.canApplyFreeTrip(pasajeroId, costo);
    } catch (err) {
      strapi.log.error('Error verificando viaje gratis:', err);
      return { canApply: false, reason: 'ERROR', error: err.message };
    }
  },

}));
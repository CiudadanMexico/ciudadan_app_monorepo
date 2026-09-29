'use strict';

const promo = require('../../../driver-launch-lead/services/promo');

/**
 * Al nacer o actualizarse un conductor, se intenta aplicar una promoción
 * pendiente de la landing de lanzamiento. `grantPendingPromoByEmail` es
 * idempotente y devuelve de inmediato si el conductor ya es elegible, así que
 * no hay riesgo de bucle driver → lead → driver.
 */
async function intentarPromo(event) {
  const resultado = event && event.result;
  if (!resultado || !resultado.email) return;
  // Evita reentradas cuando la propia aplicación de la promo dispara el evento.
  if (resultado.promo_eligible === true) return;
  try {
    await promo.grantPendingPromoByEmail(resultado.email, resultado.id);
  } catch (error) {
    strapi.log.error(`[driver/lifecycles] No se pudo aplicar la promo pendiente (${error.message || error})`);
  }
}

module.exports = {
  async afterCreate(event) {
    await intentarPromo(event);
  },
  async afterUpdate(event) {
    await intentarPromo(event);
  },
};

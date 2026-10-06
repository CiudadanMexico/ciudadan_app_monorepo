'use strict';

/**
 * Punto ÚNICO de aplicación de promociones de membresía de conductor.
 * Se llama desde el endpoint de descarga y desde el lifecycle de `driver`,
 * para no duplicar la lógica en varios controllers.
 *
 * Reglas:
 *  - la promoción sólo se otorga si el lead tiene `promo_claimed = true`
 *    (es decir, usó el endpoint de descarga, no abrió la landing);
 *  - es idempotente: si el driver ya es elegible NO se sobreescribe con
 *    datos peores (se conserva su `promo_source` y su `promo_granted_at`);
 *  - la descarga sólo concede ELEGIBILIDAD. `promo_expires_at` no se calcula
 *    aquí: los meses promocionales corren desde el inicio de la membresía real.
 */

const { normalizarEmail } = require('../utils/validaciones');

const LEAD = 'api::driver-launch-lead.driver-launch-lead';
const DRIVER = 'api::driver.driver';

const ahora = () => new Date().toISOString();

const findLead = email => strapi.db.query(LEAD).findOne({ where: { email } });

/** Búsqueda case-insensitive de conductores por email. */
const findDriver = async email =>
  strapi.db.query(DRIVER).findOne({
    where: { email: { $ilike: email } },
    select: ['id', 'email', 'promo_eligible', 'promo_source', 'promo_granted_at', 'promo_expires_at', 'documentId'],
  });

async function vincularLead(lead, driverId) {
  if (!lead || !driverId || lead.linked_driver) return;
  await strapi.db.query(LEAD).update({ where: { id: lead.id }, data: { linked_driver: driverId } });
}

/**
 * Aplica una promoción pendiente al conductor correspondiente a un email.
 * @returns {Promise<{applied: boolean, reason: string, driverId?: number}>}
 */
async function grantPendingPromoByEmail(emailRaw, driverId = null) {
  const email = normalizarEmail(emailRaw);
  if (!email) return { applied: false, reason: 'email_invalido' };

  const lead = await findLead(email);
  if (!lead) return { applied: false, reason: 'sin_lead' };
  if (lead.promo_claimed !== true) return { applied: false, reason: 'promo_no_reclamada' };

  const driver = driverId
    ? await strapi.db.query(DRIVER).findOne({ where: { id: driverId } })
    : await findDriver(email);
  if (!driver) return { applied: false, reason: 'sin_driver', leadId: lead.id };

  await vincularLead(lead, driver.id);

  if (driver.promo_eligible === true) {
    // Ya tiene una promoción (posiblemente de otra campaña): no degradarla.
    return { applied: false, reason: 'ya_elegible', driverId: driver.id };
  }

  await strapi.db.query(DRIVER).update({
    where: { id: driver.id },
    data: {
      promo_eligible: true,
      promo_source: lead.promo_source || 'prelaunch_download',
      promo_granted_at: lead.downloaded_at || ahora(),
    },
  });
  strapi.log.info(`[driver-promo] Elegibilidad otorgada a driver ${driver.id} (${lead.promo_source || 'prelaunch_download'})`);
  return { applied: true, reason: 'aplicada', driverId: driver.id };
}

/**
 * Tras una descarga efectiva: marca el lead y vincula la promoción si el
 * conductor ya existe. Si todavía no existe conductor, el lead queda
 * pendiente y el lifecycle lo resolverá al registrarse.
 */
async function aplicarPromoEnDescarga(leadId) {
  const lead = await strapi.db.query(LEAD).findOne({ where: { id: leadId } });
  if (!lead) return { applied: false, reason: 'sin_lead' };
  return grantPendingPromoByEmail(lead.email);
}

module.exports = { grantPendingPromoByEmail, aplicarPromoEnDescarga, findLead, findDriver };

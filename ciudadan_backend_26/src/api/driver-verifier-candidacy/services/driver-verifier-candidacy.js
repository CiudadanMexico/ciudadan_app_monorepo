'use strict';

/**
 * driver-verifier-candidacy service
 */

const { createCoreService } = require('@strapi/strapi').factories;

const DEFAULT_TESTING_DAYS = 15;
const DEFAULT_REQUIRED_REFERRALS = 10;

module.exports = createCoreService('api::driver-verifier-candidacy.driver-verifier-candidacy', () => ({
  /**
   * Configuración pública para la landing de Líderes Verificadores.
   *
   * Lee ÚNICAMENTE tres campos de `site-setting` (sin exponer el single
   * type completo, que puede contener datos sensibles):
   *   - driver_verifier_testing_days        → testingDays
   *   - driver_verifier_required_referrals  → requiredReferrals
   *   - verifier_candidates_whatsapp_group_url → whatsappGroupUrl
   *
   * Fallbacks seguros SOLO como protección si falta la configuración:
   * testingDays = 15, requiredReferrals = 10. La URL de WhatsApp NUNCA se
   * sustituye por una URL inventada (si no hay valor válido → null).
   */
  async getPublicConfig() {
    let site = null;

    // Lectura directa con el query builder: evita el filtrado draft/publish
    // de entityService (que no devolvía la fila publicada por el seed).
    // El single type `site-setting` es de configuración global: leer la
    // única fila (draft o publicada) es correcto para este endpoint.
    const UID = 'api::site-setting.site-setting';
    try {
      const rows = await strapi.db.query(UID).findMany({ limit: 1 });
      site = rows[0] || null;
    } catch (err) {
      strapi.log.warn('[driver-verifier] no se pudo leer site-setting:', err.message);
    }

    if (!site) {
      strapi.log.warn('[driver-verifier] site-setting vacío — se usan defaults');
    }

    const rawDays = Number(site?.driver_verifier_testing_days);
    const rawReferrals = Number(site?.driver_verifier_required_referrals);
    const rawWhatsapp = site?.verifier_candidates_whatsapp_group_url;

    const testingDays =
      Number.isInteger(rawDays) && rawDays > 0
        ? rawDays
        : DEFAULT_TESTING_DAYS;
    const requiredReferrals =
      Number.isInteger(rawReferrals) && rawReferrals > 0
        ? rawReferrals
        : DEFAULT_REQUIRED_REFERRALS;
    const whatsappGroupUrl =
      typeof rawWhatsapp === 'string' && rawWhatsapp.startsWith('https://')
        ? rawWhatsapp
        : null;

    return { testingDays, requiredReferrals, whatsappGroupUrl };
  },
}));
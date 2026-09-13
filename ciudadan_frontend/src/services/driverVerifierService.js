// src/services/driverVerifierService.js
// Servicio del programa de Líderes Verificadores de Conductores.
// Por ahora solo expone la configuración pública para la landing; crecerá
// con registro/candidaturas en tareas posteriores.
import { fetchJson, STRAPI_URL } from '../utils/request.utils';

const PUBLIC_CONFIG_URL = `${STRAPI_URL}/api/driver-verifier/public-config`;

// Fallbacks seguros SOLO si falta temporalmente la configuración del backend
// (criterios de la tarea: testingDays=15, requiredReferrals=10, y NUNCA
// inventar una URL de WhatsApp).
export const DRIVER_VERIFIER_DEFAULTS = Object.freeze({
  testingDays: 15,
  requiredReferrals: 10,
  whatsappGroupUrl: null,
});

/**
 * Obtiene la configuración pública de la landing de Líderes Verificadores:
 * { testingDays, requiredReferrals, whatsappGroupUrl }.
 * Nunca lanza: ante cualquier error devuelve defaults seguros.
 */
export async function getPublicConfig() {
  try {
    const res = await fetchJson(
      PUBLIC_CONFIG_URL,
      {},
      'No se pudo obtener la configuración del programa'
    );

    const days = Number(res?.testingDays);
    const referrals = Number(res?.requiredReferrals);
    const url = res?.whatsappGroupUrl;

    return {
      testingDays:
        Number.isInteger(days) && days > 0
          ? days
          : DRIVER_VERIFIER_DEFAULTS.testingDays,
      requiredReferrals:
        Number.isInteger(referrals) && referrals > 0
          ? referrals
          : DRIVER_VERIFIER_DEFAULTS.requiredReferrals,
      whatsappGroupUrl:
        typeof url === 'string' && url.startsWith('https://')
          ? url
          : DRIVER_VERIFIER_DEFAULTS.whatsappGroupUrl,
    };
  } catch (err) {
    // La landing nunca debe quedarse en blanco ni mostrar errores técnicos:
    // se usa configuración por defecto y se ocultan los CTAs de WhatsApp.
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[driverVerifierService] getPublicConfig:', err.message);
    }
    return { ...DRIVER_VERIFIER_DEFAULTS };
  }
}
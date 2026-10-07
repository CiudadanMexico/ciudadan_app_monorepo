'use strict';

/**
 * Verificación Cloudflare Turnstile para los endpoints públicos de la landing.
 *
 * - TURNSTILE_DISABLED=true  → se omite (explícito, pensado para dev local).
 * - TURNSTILE_SECRET_KEY ausente en producción → se RECHAZA (la seguridad
 *   nunca se apaga por falta de una variable).
 */

const axios = require('axios');

const ENDPOINT = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

function politicaSinConfig() {
  const esProduccion = process.env.NODE_ENV === 'production';
  if (esProduccion) {
    return { ok: false, codigo: 503, detalle: 'TURNSTILE_SECRET_KEY no está configurada' };
  }
  return { ok: true, omitido: true };
}

/** @returns {Promise<{ok: boolean, codigo?: number, detalle?: string, omitido?: boolean}>} */
async function verificarTurnstile(token, { strapi } = {}) {
  const log = strapi ? strapi.log : console;
  if (process.env.TURNSTILE_DISABLED === 'true') return { ok: true, omitido: true };

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    const politica = politicaSinConfig();
    log.warn(`[turnstile] ${politica.detalle} — ${politica.ok ? 'se omite (no productivo)' : 'solicitud rechazada'}`);
    return politica;
  }
  if (!token || typeof token !== 'string') {
    return { ok: false, codigo: 400, detalle: 'Falta el token de verificación' };
  }

  try {
    const params = new URLSearchParams({ secret, response: token });
    const respuesta = await axios.post(
      ENDPOINT,
      params,
      { timeout: 10000, headers: { 'content-type': 'application/x-www-form-urlencoded' } },
    );
    if (respuesta.data?.success === true) return { ok: true };
    return { ok: false, codigo: 400, detalle: (respuesta.data?.['error-codes'] || []).join(',') || 'token inválido' };
  } catch (error) {
    // Fallo de red: no dejemos pasar abuso silencioso, pero sin tumbar nada.
    log.error(`[turnstile] No se pudo verificar el token (${error.message || error})`);
    return { ok: false, codigo: 503, detalle: 'No se pudo contactar al servicio de verificación' };
  }
}

module.exports = { verificarTurnstile, politicaSinConfig };

'use strict';

/**
 * Validación y normalización pura de los leads de la landing de conductores.
 * Sin dependencias de `strapi` para poder probarla con `node --test`.
 */

const crypto = require('node:crypto');

const EMAIL_MAX = 254;
// Validación pragmática: basta para rechazar basura; la entrega la decide Brevo.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** trim + lowercase. Devuelve null si no es un email aprovechable. */
function normalizarEmail(valor) {
  const limpio = typeof valor === 'string' ? valor.trim().toLowerCase() : '';
  if (!limpio || limpio.length > EMAIL_MAX) return null;
  return EMAIL_RE.test(limpio) ? limpio : null;
}

const esEmailValido = valor => normalizarEmail(valor) !== null;

/** Token criptográficamente seguro (nunca Math.random). */
function generarToken() {
  return crypto.randomBytes(32).toString('base64url');
}

/** Comparación en tiempo constante para el token de descarga. */
function tokenCoincide(recibido, esperado) {
  if (typeof recibido !== 'string' || typeof esperado !== 'string') return false;
  const a = Buffer.from(recibido.slice(0, 128), 'utf8');
  const b = Buffer.from(esperado.slice(0, 128), 'utf8');
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

const textoCorto = (valor, max = 300) => {
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim();
  return limpio ? limpio.slice(0, max) : null;
};

/** Extrae sólo los UTM conocidos y el referrer (nada de IPs ni datos sobrantes). */
function normalizarAtribucion(input = {}) {
  const salida = {};
  for (const campo of ['utmSource', 'utmMedium', 'utmCampaign', 'utmContent']) {
    const clave = `utm_${campo.slice(3).toLowerCase()}`;
    const valor = textoCorto(input[campo] ?? input[clave], 300);
    if (valor) salida[clave] = valor;
  }
  const referrer = textoCorto(input.referrer ?? input.origen, 1000);
  if (referrer) salida.referrer = referrer;
  return salida;
}

/** true sólo si hubo consentimiento explícito y verificable. */
function normalizarConsentimiento(input = {}) {
  const acepta = input.emailConsent === true || input.consentimiento === true;
  if (!acepta) return { email_consent: false, email_consent_at: null, privacy_version: null };
  return {
    email_consent: true,
    email_consent_at: new Date().toISOString(),
    privacy_version: textoCorto(input.privacyVersion, 60) || 'conductor-launch-2026-09',
  };
}

module.exports = { normalizarEmail, esEmailValido, generarToken, tokenCoincide, normalizarAtribucion, normalizarConsentimiento, textoCorto };

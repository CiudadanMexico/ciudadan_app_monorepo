'use strict';

/**
 * Cifrado de la CLABE en reposo (spec decision 11: "almacenada con proteccion
 * y enmascaramiento").
 *
 * AES-256-GCM con clave derivada (scrypt) de la primera APP_KEY de Strapi:
 *  - APP_KEYS es obligatorio para que Strapi arranque, asi que la clave existe
 *    en todo entorno donde el backend corre.
 *  - Formato persistido: `v1:<iv_b64>:<tag_b64>:<ct_b64>`.
 *  - FAIL CLOSED: sin APP_KEYS no se guarda la CLABE (error explicito), nunca
 *    se guarda en claro.
 *
 * La clave derivada se cachea por proceso; el texto en claro no vive en
 * memoria mas alla de la request.
 */

const crypto = require('crypto');

const FORMATO = 'v1';
const CONTEXTO_KDF = 'ciudadan-delivery-clabe-v1';

function appKeysDisponibles() {
  const raw = process.env.APP_KEYS || '';
  const primera = raw.split(',')[0].trim();
  return primera.length > 0;
}

let claveCache = null;

function claveDeCifrado() {
  if (!appKeysDisponibles()) return null;
  if (claveCache) return claveCache;

  const primera = (process.env.APP_KEYS || '').split(',')[0].trim();
  claveCache = crypto.scryptSync(primera, CONTEXTO_KDF, 32);
  return claveCache;
}

/** Cifra un secreto. Devuelve el sobre `v1:iv:tag:ct` o null si falta APP_KEYS. */
function cifrarSecreto(textoPlano) {
  if (typeof textoPlano !== 'string' || !textoPlano) return null;
  const clave = claveDeCifrado();
  if (!clave) return null;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', clave, iv);
  const ct = Buffer.concat([cipher.update(textoPlano, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [FORMATO, iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join(':');
}

/** Descifra un sobre del formato propio. Null si el sobre es invalido. */
function descifrarSecreto(sobre) {
  if (typeof sobre !== 'string') return null;
  const partes = sobre.split(':');
  if (partes.length !== 4 || partes[0] !== FORMATO) return null;

  const clave = claveDeCifrado();
  if (!clave) return null;

  try {
    const iv = Buffer.from(partes[1], 'base64');
    const tag = Buffer.from(partes[2], 'base64');
    const ct = Buffer.from(partes[3], 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', clave, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  } catch {
    // Tag invalido o sobre corrupto: sin texto en claro.
    return null;
  }
}

/** ¿El entorno puede cifrar? (para fallar cerrado con mensaje claro) */
function cifradoDisponible() {
  return appKeysDisponibles();
}

module.exports = {
  cifrarSecreto,
  descifrarSecreto,
  cifradoDisponible,
};

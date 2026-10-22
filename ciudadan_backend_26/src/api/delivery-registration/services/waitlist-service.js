'use strict';

/**
 * Lista de espera de repartidores (spec §12A): alta voluntaria con
 * consentimiento para ciudades SIN agencia activa elegible. Solo email +
 * ciudad: nada de INE, CURP ni CLABE.
 *
 * Replica el PATRON de driver-launch-lead (dedup por email unico normalizado,
 * consentimiento versionado, baja explicita, rate-limit in-memory por hash
 * sin guardar IPs), NO su coleccion (acoplada a promo/APK/launch).
 */

const { UIDS, WAITLIST_PRIVACY_VERSION } = require('../utils/constants');
const { crearRateLimiter } = require('../utils/rate-limit');

const badRequest = (mensaje) => {
  const error = new Error(mensaje);
  error.status = 400;
  error.expose = true;
  return error;
};

const conflict = (mensaje) => {
  const error = new Error(mensaje);
  error.status = 409;
  error.expose = true;
  return error;
};

// 5 altas/bajas por ventana de 10 minutos por ip+email: la lista es de
// volumen bajo y no hay motivo para tolerar ráfagas.
const limitador = crearRateLimiter({ ventanaMs: 10 * 60 * 1000, max: 5 });

function normalizarEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function suscribir({ email, city, municipality, consent, ip = 'anon' }) {
  const strapi = global.strapi;

  const limpio = normalizarEmail(email);
  const cityLimpia = String(city || '').trim();
  const munLimpia = String(municipality || '').trim() || null;

  if (!limpio || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(limpio)) {
    throw badRequest('Correo electronico invalido');
  }
  if (!cityLimpia) throw badRequest('Indica tu ciudad de operacion');
  if (consent !== true) {
    throw badRequest('Se requiere tu consentimiento para avisarte de nueva cobertura');
  }

  const rate = limitador.permit(`${ip}:${limpio}`);
  if (!rate.permitido) {
    const error = new Error('Demasiados intentos; espera unos minutos');
    error.status = 429;
    error.expose = true;
    throw error;
  }

  const existente = await strapi.db.query(UIDS.WAITLIST).findOne({ where: { email: limpio } });

  if (existente && existente.status === 'activa') {
    throw conflict('Este correo ya esta en la lista de espera de repartidores');
  }

  const data = {
    city: cityLimpia,
    municipality: munLimpia,
    consent: true,
    consent_at: new Date().toISOString(),
    privacy_version: WAITLIST_PRIVACY_VERSION,
    status: 'activa',
    unsubscribed_at: null,
    source: 'quiero-repartir-sin-cobertura',
  };

  if (existente) {
    // Re-alta tras baja: se reactiva con consentimiento nuevo (dedup, spec 12E.4).
    const reactivado = await strapi.db.query(UIDS.WAITLIST).update({
      where: { id: existente.id },
      data,
    });
    return { creado: false, reactivado: true, entry: reactivado };
  }

  const entry = await strapi.db.query(UIDS.WAITLIST).create({
    data: { email: limpio, ...data },
  });
  return { creado: true, reactivado: false, entry };
}

async function baja({ email }) {
  const strapi = global.strapi;
  const limpio = normalizarEmail(email);

  if (!limpio) throw badRequest('Correo electronico requerido');

  const existente = await strapi.db.query(UIDS.WAITLIST).findOne({ where: { email: limpio } });
  if (!existente || existente.status === 'dada_de_baja') {
    // Idempotente: dar de baja dos veces no es error.
    return { ok: true, estado: 'dada_de_baja' };
  }

  await strapi.db.query(UIDS.WAITLIST).update({
    where: { id: existente.id },
    data: { status: 'dada_de_baja', unsubscribed_at: new Date().toISOString() },
  });
  return { ok: true, estado: 'dada_de_baja' };
}

module.exports = { suscribir, baja };

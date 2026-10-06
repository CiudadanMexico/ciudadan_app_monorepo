'use strict';

/**
 * Lógica pura (sin `strapi`) de la configuración de membresía de CONDUCTOR.
 * Se mantiene aislada del service para poder probarla con `node --test`.
 */

const DEFAULTS = {
  regular_monthly_price: 500,
  promotional_monthly_price: 300,
  currency: 'MXN',
  promotion_duration_months: 12,
  promotion_active: true,
  promotion_claim_deadline: null,
  launch_at: null,
  launch_title: 'Gran lanzamiento Ciudadan',
  apk_version: null,
};

const numero = (value, fallback) => {
  const parsed = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const entero = (value, fallback) => {
  const parsed = typeof value === 'number' ? value : parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const fecha = value => {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
};

/** Combina el registro del Single Type con defaults seguros. Nunca lanza. */
function normalizarConfig(fila) {
  const src = fila && typeof fila === 'object' ? fila : {};
  const deadline = fecha(src.promotion_claim_deadline);
  const launch = fecha(src.launch_at);
  return {
    regular_monthly_price: numero(src.regular_monthly_price, DEFAULTS.regular_monthly_price),
    promotional_monthly_price: numero(src.promotional_monthly_price, DEFAULTS.promotional_monthly_price),
    currency: (String(src.currency || '').trim() || DEFAULTS.currency).slice(0, 8).toUpperCase(),
    promotion_duration_months: entero(src.promotion_duration_months, DEFAULTS.promotion_duration_months),
    promotion_active: src.promotion_active === undefined ? DEFAULTS.promotion_active : Boolean(src.promotion_active),
    promotion_claim_deadline: deadline,
    launch_at: launch,
    launch_title: String(src.launch_title || DEFAULTS.launch_title).slice(0, 160),
    apk_version: src.apk_version ? String(src.apk_version).slice(0, 60) : null,
  };
}

/** Únicos campos que la UI necesita. Sin ids ni metadata interna de Strapi. */
function configPublica(config) {
  const c = normalizarConfig(config);
  return {
    regularMonthlyPrice: c.regular_monthly_price,
    promotionalMonthlyPrice: c.promotional_monthly_price,
    currency: c.currency,
    promotionDurationMonths: c.promotion_duration_months,
    promotionActive: c.promotion_active,
    promotionClaimDeadline: c.promotion_claim_deadline,
    launchAt: c.launch_at,
    launchTitle: c.launch_title,
  };
}

/** ¿Aún se puede obtener la promoción? (activa y dentro del plazo) */
function sePuedeReclamarPromocion(config, now = Date.now()) {
  const c = normalizarConfig(config);
  if (!c.promotion_active) return { permitido: false, razon: 'promotion_inactive' };
  if (c.promotion_claim_deadline && now > Date.parse(c.promotion_claim_deadline)) {
    return { permitido: false, razon: 'deadline_expired' };
  }
  return { permitido: true, razon: null };
}

/**
 * Precio efectivo de la membresía de un conductor.
 * El servidor decide: NUNCA se acepta un precio enviado por el cliente.
 */
function resolverPrecioMembresia(driver, config, now = Date.now()) {
  const c = normalizarConfig(config);
  const regular = { price: c.regular_monthly_price, currency: c.currency, promocional: false, motivo: 'sin_promocion' };
  if (!driver || driver.promo_eligible !== true) return regular;
  if (!driver.promo_source) return { ...regular, motivo: 'sin_fuente' };
  if (driver.promo_expires_at) {
    const expira = Date.parse(driver.promo_expires_at);
    if (!Number.isNaN(expira) && now > expira) return { ...regular, motivo: 'promocion_vencida' };
  }
  return {
    price: c.promotional_monthly_price,
    currency: c.currency,
    promocional: true,
    motivo: 'promocion_vigente',
    promoSource: driver.promo_source,
    duracionMeses: c.promotion_duration_months,
  };
}

module.exports = { DEFAULTS, normalizarConfig, configPublica, sePuedeReclamarPromocion, resolverPrecioMembresia };

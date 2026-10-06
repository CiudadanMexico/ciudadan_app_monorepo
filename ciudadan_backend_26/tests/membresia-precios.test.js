'use strict';

/**
 * Pruebas de la configuración de precios de la membresía de conductor.
 * Ejecutar: npm test  (o node --test tests/)
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizarConfig, configPublica, sePuedeReclamarPromocion, resolverPrecioMembresia, DEFAULTS } = require('../src/api/driver-membership-config/utils/precios');

test('normalizarConfig aplica los defaults 500/300 y 12 meses', () => {
  const config = normalizarConfig(null);
  assert.equal(config.regular_monthly_price, 500);
  assert.equal(config.promotional_monthly_price, 300);
  assert.equal(config.promotion_duration_months, 12);
  assert.equal(config.currency, 'MXN');
  assert.equal(config.promotion_active, true);
  assert.equal(config.promotion_claim_deadline, null);
});

test('normalizarConfig tolera basura y fechas inválidas sin lanzar', () => {
  const config = normalizarConfig({
    regular_monthly_price: 'no-es-número',
    promotional_monthly_price: NaN,
    promotion_duration_months: -4,
    currency: '   ',
    promotion_claim_deadline: 'definitivamente-no-es-una-fecha',
    launch_at: null,
  });
  assert.equal(config.regular_monthly_price, DEFAULTS.regular_monthly_price);
  assert.equal(config.promotional_monthly_price, DEFAULTS.promotional_monthly_price);
  assert.equal(config.promotion_duration_months, DEFAULTS.promotion_duration_months);
  assert.equal(config.promotion_claim_deadline, null);
  assert.equal(config.currency, 'MXN');
});

test('normalizarConfig acepta precios en string y formatea la fecha a ISO', () => {
  const config = normalizarConfig({
    regular_monthly_price: '450.5',
    promotional_monthly_price: '250',
    promotion_claim_deadline: '2026-10-09T23:59:59.000Z',
  });
  assert.equal(config.regular_monthly_price, 450.5);
  assert.equal(config.promotional_monthly_price, 250);
  assert.equal(config.promotion_claim_deadline, '2026-10-09T23:59:59.000Z');
});

test('configPublica no filtra ids ni campos internos de Strapi', () => {
  const publica = configPublica({ regular_monthly_price: 500, promotional_monthly_price: 300, apk_version: '1.2.3' });
  assert.deepEqual(Object.keys(publica).sort(), [
    'currency',
    'launchAt',
    'launchTitle',
    'promotionActive',
    'promotionClaimDeadline',
    'promotionDurationMonths',
    'promotionalMonthlyPrice',
    'regularMonthlyPrice',
  ]);
  assert.equal(publica.promotionalMonthlyPrice, 300);
  assert.equal(publica.regularMonthlyPrice, 500);
  assert.equal(publica.promotionDurationMonths, 12);
});

test('sePuedeReclamarPromocion: activa y sin plazo → permitido', () => {
  assert.deepEqual(sePuedeReclamarPromocion({}, Date.UTC(2026, 8, 28)), { permitido: true, razon: null });
});

test('sePuedeReclamarPromocion: fecha límite superada → NO permitido', () => {
  const config = { promotion_claim_deadline: '2026-10-09T23:59:59.000Z' };
  const despues = sePuedeReclamarPromocion(config, Date.parse('2026-10-10T00:00:01Z'));
  assert.equal(despues.permitido, false);
  assert.equal(despues.razon, 'deadline_expired');
  const antes = sePuedeReclamarPromocion(config, Date.parse('2026-10-01T00:00:00Z'));
  assert.equal(antes.permitido, true);
});

test('sePuedeReclamarPromocion: promoción desactivada → NO permitido', () => {
  const estado = sePuedeReclamarPromocion({ promotion_active: false });
  assert.equal(estado.permitido, false);
  assert.equal(estado.razon, 'promotion_inactive');
});

test('resolverPrecioMembresia: conductor elegible paga el precio promocional', () => {
  const driver = { promo_eligible: true, promo_source: 'prelaunch_download' };
  const precio = resolverPrecioMembresia(driver, {});
  assert.equal(precio.price, 300);
  assert.equal(precio.promocional, true);
  assert.equal(precio.duracionMeses, 12);
  assert.equal(precio.currency, 'MXN');
});

test('resolverPrecioMembresia: sin elegibilidad paga el precio ordinario', () => {
  assert.equal(resolverPrecioMembresia({}, {}).price, 500);
  assert.equal(resolverPrecioMembresia({ promo_eligible: false }, {}).price, 500);
  assert.equal(resolverPrecioMembresia(null, {}).price, 500);
});

test('resolverPrecioMembresia: elegible sin fuente no se confía (sin_promocion)', () => {
  const precio = resolverPrecioMembresia({ promo_eligible: true }, {});
  assert.equal(precio.price, 500);
  assert.equal(precio.promocional, false);
  assert.equal(precio.motivo, 'sin_fuente');
});

test('resolverPrecioMembresia: promoción vencida vuelve al precio ordinario', () => {
  const driver = {
    promo_eligible: true,
    promo_source: 'campana_wa',
    promo_expires_at: '2026-01-01T00:00:00.000Z',
  };
  const precio = resolverPrecioMembresia(driver, {}, Date.parse('2026-09-01T00:00:00Z'));
  assert.equal(precio.price, 500);
  assert.equal(precio.motivo, 'promocion_vencida');
});

test('resolverPrecioMembresia: sin promo_expires_at los meses corren desde la membresía real', () => {
  const driver = { promo_eligible: true, promo_source: 'prelaunch_download', promo_expires_at: null };
  // Aunque pasen años desde la descarga, la elegibilidad sigue vigente.
  const precio = resolverPrecioMembresia(driver, {}, Date.parse('2030-01-01T00:00:00Z'));
  assert.equal(precio.price, 300);
  assert.equal(precio.promocional, true);
});

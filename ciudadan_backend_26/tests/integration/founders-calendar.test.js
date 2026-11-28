'use strict';

/**
 * Tests de integración reales para el calendario Founders (13 periodos).
 * Ejecuta handlePaymentSuccess real contra PostgreSQL con fechas reales,
 * meses de distinta duración y zonas horarias.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  initStrapi,
  destroyStrapi,
  cleanTables,
  createTestUser,
  createTestDriver,
} = require('./bootstrap.js');

const TEST_UIDS = [
  'api::driver-membership.driver-membership',
  'api::driver.driver',
];

let strapi = null;

test.before(async () => {
  strapi = await initStrapi();
  await cleanTables(strapi, TEST_UIDS);
});

test.after(async () => {
  await destroyStrapi();
});

test.beforeEach(async () => {
  await cleanTables(strapi, TEST_UIDS);
});

test('Founders: primer mes GRATIS ($0), luego 12 meses a $300, mes 14 a $500', async () => {
  const user = await createTestUser(strapi);
  const driver = await createTestDriver(strapi, user);

  // Crear membresía Founders: primer mes gratis
  const membership = await strapi.entityService.create('api::driver-membership.driver-membership', {
    data: {
      driver: driver.id,
      user: user.id,
      plan: 'promo',
      price_mxn: 0, // Primer mes gratis
      status: 'active',
      activation_mode: 'pay_now',
      current_period_end: new Date('2026-01-01T00:00:00Z').toISOString(),
      promo_expires_at: new Date('2027-01-01T00:00:00Z').toISOString(), // 12 meses
      last_payment_date: null,
      last_payment_amount: 0,
      failed_payments_count: 0,
    },
  });

  const service = strapi.service('api::driver-membership.driver-membership');

  // Simular handlePaymentSuccess para el primer pago (mes 1 gratis)
  // En la vida real, esto se llama tras confirmar el pago (monto 0)
  const result1 = await service.handlePaymentSuccess(membership.id, {
    paymentId: 'pay-test-1',
    amount: 0,
    paymentMethod: 'promo',
    paidAt: new Date('2026-01-01T00:00:00Z').toISOString(),
  });

  // Después del mes 1 gratis, el siguiente precio debe ser $300 (mes 2)
  assert.equal(result1.price_mxn, 300, 'Después del mes 1 gratis, precio para mes 2 = $300');
  assert.equal(result1.current_period_end, '2026-02-01T00:00:00.000Z');

  // Simular pagos 2-13 (12 pagos de $300 = meses 2-13)
  for (let month = 2; month <= 13; month++) {
    const periodEnd = new Date('2026-01-01T00:00:00Z');
    periodEnd.setUTCMonth(periodEnd.getUTCMonth() + month);
    const expectedNextPrice = month < 13 ? 300 : 500;

    const result = await service.handlePaymentSuccess(membership.id, {
      paymentId: `pay-test-${month}`,
      amount: 300,
      paymentMethod: 'card',
      paidAt: periodEnd.toISOString(),
    });

    assert.equal(result.price_mxn, expectedNextPrice,
      `Mes ${month}: precio para mes ${month + 1} = $${expectedNextPrice}`);

    const expectedPeriodEnd = new Date('2026-01-01T00:00:00Z');
    expectedPeriodEnd.setUTCMonth(expectedPeriodEnd.getUTCMonth() + month + 1);
    assert.equal(result.current_period_end, expectedPeriodEnd.toISOString());
  }

  // Mes 14: precio regular $500
  const periodEnd14 = new Date('2026-01-01T00:00:00Z');
  periodEnd14.setUTCMonth(periodEnd14.getUTCMonth() + 14);
  const result14 = await service.handlePaymentSuccess(membership.id, {
    paymentId: 'pay-test-14',
    amount: 500,
    paymentMethod: 'card',
    paidAt: periodEnd14.toISOString(),
  });

  assert.equal(result14.price_mxn, 500, 'Mes 14: precio regular $500');
});

test('Founders: transición a $500 exactamente en promo_expires_at', async () => {
  const user = await createTestUser(strapi);
  const driver = await createTestDriver(strapi, user);

  // Membresía creada justo antes de expirar la promo
  const membership = await strapi.entityService.create('api::driver-membership.driver-membership', {
    data: {
      driver: driver.id,
      user: user.id,
      plan: 'promo',
      price_mxn: 300,
      status: 'active',
      activation_mode: 'pay_now',
      current_period_end: new Date('2026-12-01T00:00:00Z').toISOString(), // Mes 12
      promo_expires_at: new Date('2027-01-01T00:00:00Z').toISOString(), // Expira en mes 13
      last_payment_date: new Date('2026-11-01T00:00:00Z').toISOString(),
      last_payment_amount: 300,
      failed_payments_count: 0,
    },
  });

  const service = strapi.service('api::driver-membership.driver-membership');

  // Pago del mes 12 (current_period_end = Dec 1, 2026)
  // nextPaymentDate = Jan 1, 2027 = promo_expires_at
  // promoEnded = false (no >), siguiente precio = $300 (mes 13)
  const result12 = await service.handlePaymentSuccess(membership.id, {
    paymentId: 'pay-test-12',
    amount: 300,
    paymentMethod: 'card',
    paidAt: new Date('2026-12-01T00:00:00Z').toISOString(),
  });

  assert.equal(result12.price_mxn, 300, 'Mes 12: siguiente precio $300 (promo aún activa)');

  // Pago del mes 13 (current_period_end = Jan 1, 2027 = promo_expires_at)
  // nextPaymentDate = Feb 1, 2027 > promo_expires_at
  // promoEnded = true, siguiente precio = $500 (mes 14)
  const result13 = await service.handlePaymentSuccess(membership.id, {
    paymentId: 'pay-test-13',
    amount: 300,
    paymentMethod: 'card',
    paidAt: new Date('2027-01-01T00:00:00Z').toISOString(),
  });

  assert.equal(result13.price_mxn, 500, 'Mes 13: siguiente precio $500 (promo terminada)');
});

test('Founders: meses de distinta duración (enero 31 días, febrero 28, marzo 31)', async () => {
  const user = await createTestUser(strapi);
  const driver = await createTestDriver(strapi, user);

  const membership = await strapi.entityService.create('api::driver-membership.driver-membership', {
    data: {
      driver: driver.id,
      user: user.id,
      plan: 'promo',
      price_mxn: 300,
      status: 'active',
      activation_mode: 'pay_now',
      current_period_end: new Date('2026-01-31T00:00:00Z').toISOString(), // Fin enero
      promo_expires_at: new Date('2027-01-01T00:00:00Z').toISOString(),
      last_payment_date: new Date('2026-01-01T00:00:00Z').toISOString(),
      last_payment_amount: 300,
      failed_payments_count: 0,
    },
  });

  const service = strapi.service('api::driver-membership.driver-membership');

  // Pago enero -> nextPeriodEnd = Feb 28 (no Feb 31)
  const resultJan = await service.handlePaymentSuccess(membership.id, {
    paymentId: 'pay-jan',
    amount: 300,
    paymentMethod: 'card',
    paidAt: new Date('2026-01-31T00:00:00Z').toISOString(),
  });

  assert.equal(resultJan.current_period_end, '2026-02-28T00:00:00.000Z',
    'Enero 31 días -> siguiente periodo termina 28 feb');

  // Pago febrero -> nextPeriodEnd = Mar 28 (no Mar 31)
  const resultFeb = await service.handlePaymentSuccess(membership.id, {
    paymentId: 'pay-feb',
    amount: 300,
    paymentMethod: 'card',
    paidAt: new Date('2026-02-28T00:00:00Z').toISOString(),
  });

  assert.equal(resultFeb.current_period_end, '2026-03-28T00:00:00.000Z',
    'Febrero 28 días -> siguiente periodo termina 28 mar');

  // Pago marzo -> nextPeriodEnd = Apr 28
  const resultMar = await service.handlePaymentSuccess(membership.id, {
    paymentId: 'pay-mar',
    amount: 300,
    paymentMethod: 'card',
    paidAt: new Date('2026-03-28T00:00:00Z').toISOString(),
  });

  assert.equal(resultMar.current_period_end, '2026-04-28T00:00:00.000Z',
    'Marzo 28 días (desde feb) -> siguiente periodo termina 28 abr');
});

test('Founders: zona horaria UTC vs local - promo_expires_at a medianoche UTC', async () => {
  const user = await createTestUser(strapi);
  const driver = await createTestDriver(strapi, user);

  // Membresía con promo_expires_at en UTC midnight
  const membership = await strapi.entityService.create('api::driver-membership.driver-membership', {
    data: {
      driver: driver.id,
      user: user.id,
      plan: 'promo',
      price_mxn: 300,
      status: 'active',
      activation_mode: 'pay_now',
      current_period_end: new Date('2026-12-01T00:00:00Z').toISOString(),
      promo_expires_at: new Date('2027-01-01T00:00:00.000Z').toISOString(),
      last_payment_date: new Date('2026-11-01T00:00:00Z').toISOString(),
      last_payment_amount: 300,
      failed_payments_count: 0,
    },
  });

  const service = strapi.service('api::driver-membership.driver-membership');

  // Pago a las 23:00 UTC del 31 dic (aún 31 dic en UTC, pero 1 ene en zona +1)
  // El server usa UTC, así que nextPaymentDate = Jan 1, 2027 00:00:00 UTC
  // promoEnded = false (igual), siguiente = $300
  const result1 = await service.handlePaymentSuccess(membership.id, {
    paymentId: 'pay-utc-1',
    amount: 300,
    paymentMethod: 'card',
    paidAt: new Date('2026-12-31T23:00:00Z').toISOString(),
  });

  assert.equal(result1.price_mxn, 300, 'Pago 31 dic 23:00 UTC -> promo aún activa ($300)');

  // Pago a las 01:00 UTC del 1 ene (ya 1 ene en UTC)
  // nextPaymentDate = Feb 1, 2027 > promo_expires_at
  // promoEnded = true, siguiente = $500
  const result2 = await service.handlePaymentSuccess(membership.id, {
    paymentId: 'pay-utc-2',
    amount: 500,
    paymentMethod: 'card',
    paidAt: new Date('2027-01-01T01:00:00Z').toISOString(),
  });

  assert.equal(result2.price_mxn, 500, 'Pago 1 ene 01:00 UTC -> promo terminada ($500)');
});

test('Founders: pay_later también tiene primer mes gratis', async () => {
  const user = await createTestUser(strapi);
  const driver = await createTestDriver(strapi, user);

  const membership = await strapi.entityService.create('api::driver-membership.driver-membership', {
    data: {
      driver: driver.id,
      user: user.id,
      plan: 'promo',
      price_mxn: 0,
      status: 'pending', // pay_later empieza en pending
      activation_mode: 'pay_later',
      current_period_end: new Date('2026-01-01T00:00:00Z').toISOString(),
      promo_expires_at: new Date('2027-01-01T00:00:00Z').toISOString(),
      last_payment_date: null,
      last_payment_amount: 0,
      failed_payments_count: 0,
    },
  });

  const service = strapi.service('api::driver-membership.driver-membership');

  // Primer pago (gratis) activa la membresía
  const result1 = await service.handlePaymentSuccess(membership.id, {
    paymentId: 'pay-later-1',
    amount: 0,
    paymentMethod: 'promo',
    paidAt: new Date('2026-01-01T00:00:00Z').toISOString(),
  });

  assert.equal(result1.status, 'active', 'pay_later: primer pago activa membresía');
  assert.equal(result1.price_mxn, 300, 'pay_later: después del mes 1 gratis, precio $300');
});
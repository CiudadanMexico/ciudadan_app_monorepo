'use strict';

/**
 * Tests de integración reales para idempotencia con PostgreSQL.
 * Prueba concurrencia real usando advisory locks y UPSERT atómico.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
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
  'api::idempotency-key.idempotency-key',
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

test('Idempotencia: checkAndRecordIdempotency adquiere lock atómico (isFirst=true/false)', async () => {
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
      current_period_end: new Date('2026-01-01T00:00:00Z').toISOString(),
      promo_expires_at: new Date('2027-01-01T00:00:00Z').toISOString(),
    },
  });

  const service = strapi.service('api::driver-membership.driver-membership');

  // Generar clave idempotente determinista
  const idempotencyKey = crypto
    .createHash('sha256')
    .update(`${driver.id}:payment_success:${membership.id}:pay-123`)
    .digest('hex');

  // Primera llamada -> isFirst = true
  const result1 = await service.checkAndRecordIdempotency(idempotencyKey, 'payment_success');

  assert.equal(result1.isFirst, true, 'Primera llamada debe retornar isFirst=true');
  assert.ok(result1.record, 'Debe retornar record');
  assert.equal(result1.record.status, 'processing', 'Estado inicial = processing');

  // Segunda llamada con misma clave -> isFirst = false
  const result2 = await service.checkAndRecordIdempotency(idempotencyKey, 'payment_success');

  assert.equal(result2.isFirst, false, 'Segunda llamada debe retornar isFirst=false');
  assert.equal(result2.record.status, 'processing', 'Estado = processing (primera en curso)');

  // Marcar como completed usando la API real
  await service.markIdempotencyCompleted(idempotencyKey, { success: true });

  // Tercera llamada después de completed -> isFirst = false, record.status = completed
  const result3 = await service.checkAndRecordIdempotency(idempotencyKey, 'payment_success');

  assert.equal(result3.isFirst, false, 'Después de completed: isFirst=false');
  assert.equal(result3.record.status, 'completed', 'Estado = completed');
});

test('Idempotencia: reintento tras fallo -> isFirst=true (permite reintento)', async () => {
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
      current_period_end: new Date('2026-01-01T00:00:00Z').toISOString(),
      promo_expires_at: new Date('2027-01-01T00:00:00Z').toISOString(),
    },
  });

  const service = strapi.service('api::driver-membership.driver-membership');
  const idempotencyKey = crypto
    .createHash('sha256')
    .update(`${driver.id}:payment_success:${membership.id}:pay-retry`)
    .digest('hex');

  // Primera llamada
  const result1 = await service.checkAndRecordIdempotency(idempotencyKey, 'payment_success');
  assert.equal(result1.isFirst, true);

  // Marcar como failed (simula error en procesamiento) - API real
  await service.markIdempotencyFailed(idempotencyKey, 'Timeout');

  // Reintento -> isFirst = true (permite reintento)
  const result2 = await service.checkAndRecordIdempotency(idempotencyKey, 'payment_success');

  assert.equal(result2.isFirst, true, 'Reintento tras fallo debe permitir nueva ejecución');
  assert.equal(result2.record.status, 'processing');
});

test('CONCURRENCIA REAL: 10 llamadas simultáneas misma clave -> exactamente 1 isFirst=true', async () => {
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
      current_period_end: new Date('2026-01-01T00:00:00Z').toISOString(),
      promo_expires_at: new Date('2027-01-01T00:00:00Z').toISOString(),
    },
  });

  const service = strapi.service('api::driver-membership.driver-membership');
  const idempotencyKey = crypto
    .createHash('sha256')
    .update(`${driver.id}:payment_success:${membership.id}:pay-concurrent`)
    .digest('hex');

  // 10 llamadas concurrentes con la MISMA clave
  const promises = Array(10).fill(null).map((_, i) =>
    service.checkAndRecordIdempotency(idempotencyKey, 'payment_success')
  );

  const results = await Promise.all(promises);

  const firstCount = results.filter(r => r.isFirst === true).length;
  const notFirstCount = results.filter(r => r.isFirst === false).length;

  assert.equal(firstCount, 1, 'Exactamente 1 llamada debe tener isFirst=true');
  assert.equal(notFirstCount, 9, 'Las otras 9 deben tener isFirst=false');
  assert.equal(results.length, 10);

  // Verificar que todas tienen status válido en record
  for (const r of results) {
    assert.ok(['processing', 'completed', 'failed'].includes(r.record.status));
  }
});

test('CONCURRENCIA REAL: 50 llamadas simultáneas misma clave -> exactamente 1 isFirst=true', async () => {
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
      current_period_end: new Date('2026-01-01T00:00:00Z').toISOString(),
      promo_expires_at: new Date('2027-01-01T00:00:00Z').toISOString(),
    },
  });

  const service = strapi.service('api::driver-membership.driver-membership');
  const idempotencyKey = crypto
    .createHash('sha256')
    .update(`${driver.id}:payment_success:${membership.id}:pay-concurrent-50`)
    .digest('hex');

  const promises = Array(50).fill(null).map((_, i) =>
    service.checkAndRecordIdempotency(idempotencyKey, 'payment_success')
  );

  const results = await Promise.all(promises);

  const firstCount = results.filter(r => r.isFirst === true).length;
  assert.equal(firstCount, 1, 'Exactamente 1 de 50 debe tener isFirst=true');
  assert.equal(results.filter(r => r.isFirst === false).length, 49);
});

test('CONCURRENCIA: claves diferentes son independientes', async () => {
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
      current_period_end: new Date('2026-01-01T00:00:00Z').toISOString(),
      promo_expires_at: new Date('2027-01-01T00:00:00Z').toISOString(),
    },
  });

  const service = strapi.service('api::driver-membership.driver-membership');

  // 3 claves diferentes, cada una llamada 5 veces concurrentemente
  const key1 = crypto.createHash('sha256').update(`${driver.id}:payment_success:${membership.id}:key1`).digest('hex');
  const key2 = crypto.createHash('sha256').update(`${driver.id}:payment_success:${membership.id}:key2`).digest('hex');
  const key3 = crypto.createHash('sha256').update(`${driver.id}:payment_success:${membership.id}:key3`).digest('hex');

  const promises = [
    ...Array(5).fill(null).map((_, i) => service.checkAndRecordIdempotency(key1, 'payment_success')),
    ...Array(5).fill(null).map((_, i) => service.checkAndRecordIdempotency(key2, 'payment_success')),
    ...Array(5).fill(null).map((_, i) => service.checkAndRecordIdempotency(key3, 'payment_success')),
  ];

  const results = await Promise.all(promises);

  // Cada clave debe tener exactamente 1 isFirst=true
  const key1Results = results.slice(0, 5);
  const key2Results = results.slice(5, 10);
  const key3Results = results.slice(10, 15);

  for (const [label, keyResults] of [['key1', key1Results], ['key2', key2Results], ['key3', key3Results]]) {
    const firstCount = keyResults.filter(r => r.isFirst === true).length;
    assert.equal(firstCount, 1, `${label}: exactamente 1 isFirst=true`);
  }
});

test('Idempotencia: operaciones mixtas (payment_success, commission, preapproval_update) son independientes', async () => {
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
      current_period_end: new Date('2026-01-01T00:00:00Z').toISOString(),
      promo_expires_at: new Date('2027-01-01T00:00:00Z').toISOString(),
    },
  });

  const service = strapi.service('api::driver-membership.driver-membership');
  const baseKey = crypto.createHash('sha256').update(`${driver.id}:${membership.id}`).digest('hex');

  // Mismo membership, diferentes tipos de operación
  const paymentKey = crypto.createHash('sha256').update(`${baseKey}:payment_success:pay-1`).digest('hex');
  const commissionKey = crypto.createHash('sha256').update(`${baseKey}:commission:pay-1`).digest('hex');
  const preapprovalKey = crypto.createHash('sha256').update(`${baseKey}:preapproval_update:pa-1`).digest('hex');

  const [paymentResult, commissionResult, preapprovalResult] = await Promise.all([
    service.checkAndRecordIdempotency(paymentKey, 'payment_success'),
    service.checkAndRecordIdempotency(commissionKey, 'commission'),
    service.checkAndRecordIdempotency(preapprovalKey, 'preapproval_update'),
  ]);

  assert.equal(paymentResult.isFirst, true, 'payment_success: primera vez = isFirst=true');
  assert.equal(commissionResult.isFirst, true, 'commission: primera vez = isFirst=true');
  assert.equal(preapprovalResult.isFirst, true, 'preapproval_update: primera vez = isFirst=true');

  // Segunda llamada a cada una debe dar isFirst=false
  const [paymentResult2, commissionResult2, preapprovalResult2] = await Promise.all([
    service.checkAndRecordIdempotency(paymentKey, 'payment_success'),
    service.checkAndRecordIdempotency(commissionKey, 'commission'),
    service.checkAndRecordIdempotency(preapprovalKey, 'preapproval_update'),
  ]);

  assert.equal(paymentResult2.isFirst, false);
  assert.equal(commissionResult2.isFirst, false);
  assert.equal(preapprovalResult2.isFirst, false);
});

test('Idempotencia: clave incluye membershipId y paymentId, NO timestamp', async () => {
  const service = strapi.service('api::driver-membership.driver-membership');
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
      current_period_end: new Date('2026-01-01T00:00:00Z').toISOString(),
      promo_expires_at: new Date('2027-01-01T00:00:00Z').toISOString(),
    },
  });

  // Generar claves con diferentes timestamps pero mismos IDs
  const key1 = service.generateIdempotencyKey(membership.id, 'pay-1');
  const key2 = service.generateIdempotencyKey(membership.id, 'pay-1');
  const key3 = service.generateIdempotencyKey(membership.id, 'pay-1');

  // Deben ser IDÉNTICAS (determinista, sin timestamp)
  assert.equal(key1, key2, 'Claves con diferentes timestamps pero mismos IDs deben ser iguales');
  assert.equal(key2, key3, 'Claves con diferentes timestamps pero mismos IDs deben ser iguales');

  // Diferente paymentId debe dar clave diferente
  const keyDiff = service.generateIdempotencyKey(membership.id, 'pay-2');
  assert.notEqual(key1, keyDiff, 'Diferente paymentId debe dar clave diferente');
});
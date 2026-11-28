'use strict';

/**
 * Tests de integración reales para anti-duplicación QR con PostgreSQL.
 * Prueba canjes concurrentes: mismo pasajero + misma tarjeta -> solo 1 beneficio.
 * Prueba canjes concurrentes: mismo pasajero + diferentes tarjetas -> cada una independiente.
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
  createTestLeader,
  createTestQrCard,
} = require('./bootstrap.js');

const TEST_UIDS = [
  'api::driver-membership.driver-membership',
  'api::driver.driver',
  'api::leader.leader',
  'api::qr-physical-card.qr-physical-card',
  'api::free-trip-entitlement.free-trip-entitlement',
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

test('QR Driver-Membership: canje concurrente misma tarjeta -> solo 1 viaje gratis', async () => {
  const user = await createTestUser(strapi);
  const driver = await createTestDriver(strapi, user);
  const leaderUser = await createTestUser(strapi, { username: 'leader1' });
  const leader = await createTestLeader(strapi, leaderUser, { kit_cards_received: 100 });

  const qrCard = await createTestQrCard(strapi, leader);

  const service = strapi.service('api::driver-membership.driver-membership');

  // 10 llamadas concurrentes con la MISMA tarjeta QR
  const promises = Array(10).fill(null).map((_, i) =>
    service.grantFreeTripByQR(driver.id, qrCard.card_id).catch(e => ({ error: e.message }))
  );

  const results = await Promise.all(promises);

  const successful = results.filter(r => r.success === true).length;
  const failed = results.filter(r => r.error).length;

  assert.equal(successful, 1, 'Solo 1 canje debe ser exitoso');
  assert.equal(failed, 9, 'Los otros 9 deben fallar');

  // Verificar estado final
  const finalDriver = await strapi.entityService.findOne('api::driver.driver', driver.id);
  const finalLeader = await strapi.entityService.findOne('api::leader.leader', leader.id);
  const finalCard = await strapi.entityService.findOne('api::qr-physical-card.qr-physical-card', qrCard.id);

  assert.equal(finalDriver.free_trips, 1, 'Conductor debe tener exactamente 1 viaje gratis');
  assert.equal(finalLeader.cards_distributed, 1, 'Líder debe haber distribuido exactamente 1 tarjeta');
  assert.equal(finalCard.status, 'scanned', 'Tarjeta debe estar en estado scanned');
});

test('QR Driver-Membership: canjes concurrentes diferentes tarjetas -> cada una da 1 viaje', async () => {
  const user = await createTestUser(strapi);
  const driver = await createTestDriver(strapi, user);
  const leaderUser = await createTestUser(strapi, { username: 'leader2' });
  const leader = await createTestLeader(strapi, leaderUser, { kit_cards_received: 100 });

  // Crear 5 tarjetas QR diferentes
  const qrCards = await Promise.all(
    Array(5).fill(null).map(() => createTestQrCard(strapi, leader))
  );

  const service = strapi.service('api::driver-membership.driver-membership');

  // Canjear las 5 tarjetas concurrentemente (cada una diferente)
  const promises = qrCards.map(card =>
    service.grantFreeTripByQR(driver.id, card.card_id).catch(e => ({ error: e.message }))
  );

  const results = await Promise.all(promises);

  const successful = results.filter(r => r.success === true).length;
  const failed = results.filter(r => r.error).length;

  assert.equal(successful, 5, 'Las 5 tarjetas diferentes deben canjearse exitosamente');
  assert.equal(failed, 0, 'Ninguna debe fallar');

  // Verificar estado final
  const finalDriver = await strapi.entityService.findOne('api::driver.driver', driver.id);
  const finalLeader = await strapi.entityService.findOne('api::leader.leader', leader.id);

  assert.equal(finalDriver.free_trips, 5, 'Conductor debe tener 5 viajes gratis');
  assert.equal(finalLeader.cards_distributed, 5, 'Líder debe haber distribuido 5 tarjetas');

  // Verificar cada tarjeta está scanned
  for (const card of qrCards) {
    const finalCard = await strapi.entityService.findOne('api::qr-physical-card.qr-physical-card', card.id);
    assert.equal(finalCard.status, 'scanned', `Tarjeta ${card.card_id} debe estar scanned`);
  }
});

test('QR Free-Trip-Entitlement: canje concurrente misma tarjeta -> solo 1 entitlement', async () => {
  const user = await createTestUser(strapi);
  const leaderUser = await createTestUser(strapi, { username: 'leader3' });
  const leader = await createTestLeader(strapi, leaderUser, { kit_cards_received: 100 });

  const qrCard = await createTestQrCard(strapi, leader);

  const service = strapi.service('api::free-trip-entitlement.free-trip-entitlement');

  // 10 llamadas concurrentes con la MISMA tarjeta QR para el mismo usuario
  const promises = Array(10).fill(null).map((_, i) =>
    service.grantFreeTripByQR(user.id, qrCard.card_id).catch(e => ({ error: e.message }))
  );

  const results = await Promise.all(promises);

  const successful = results.filter(r => r.success === true).length;
  const failed = results.filter(r => r.error).length;

  assert.equal(successful, 1, 'Solo 1 canje debe ser exitoso');
  assert.equal(failed, 9, 'Los otros 9 deben fallar');

  // Verificar solo 1 entitlement creado
  const entitlements = await strapi.entityService.findMany('api::free-trip-entitlement.free-trip-entitlement', {
    filters: { user: user.id, qr_card: qrCard.id },
  });
  assert.equal(entitlements.length, 1, 'Debe haber exactamente 1 entitlement');

  // Verificar tarjeta marcada
  const finalCard = await strapi.entityService.findOne('api::qr-physical-card.qr-physical-card', qrCard.id);
  assert.equal(finalCard.status, 'scanned', 'Tarjeta debe estar scanned');
});

test('QR Free-Trip-Entitlement: mismo usuario, diferentes tarjetas -> cada una crea entitlement', async () => {
  const user = await createTestUser(strapi);
  const leaderUser = await createTestUser(strapi, { username: 'leader4' });
  const leader = await createTestLeader(strapi, leaderUser, { kit_cards_received: 100 });

  // Crear 3 tarjetas QR diferentes
  const qrCards = await Promise.all(
    Array(3).fill(null).map(() => createTestQrCard(strapi, leader))
  );

  const service = strapi.service('api::free-trip-entitlement.free-trip-entitlement');

  // Canjear las 3 tarjetas concurrentemente
  const promises = qrCards.map(card =>
    service.grantFreeTripByQR(user.id, card.card_id).catch(e => ({ error: e.message }))
  );

  const results = await Promise.all(promises);

  const successful = results.filter(r => r.success === true).length;
  const failed = results.filter(r => r.error).length;

  assert.equal(successful, 3, 'Las 3 tarjetas diferentes deben canjearse');
  assert.equal(failed, 0);

  // Verificar 3 entitlements creados
  const entitlements = await strapi.entityService.findMany('api::free-trip-entitlement.free-trip-entitlement', {
    filters: { user: user.id },
  });
  assert.equal(entitlements.length, 3, 'Debe haber 3 entitlements');
});

test('QR: conductor con viaje gratis pendiente NO puede canjear otro', async () => {
  const user = await createTestUser(strapi);
  const driver = await createTestDriver(strapi, user, { free_trips: 1 }); // Ya tiene 1
  const leaderUser = await createTestUser(strapi, { username: 'leader5' });
  const leader = await createTestLeader(strapi, leaderUser);
  const qrCard = await createTestQrCard(strapi, leader);

  const service = strapi.service('api::driver-membership.driver-membership');

  const result = await service.grantFreeTripByQR(driver.id, qrCard.card_id).catch(e => ({ error: e.message }));

  assert.ok(result.error, 'Debe fallar');
  assert.match(result.error, /ya tiene un viaje gratis/, 'Error debe mencionar viaje pendiente');
});

test('QR: tarjeta ya escaneada NO puede usarse de nuevo', async () => {
  const user = await createTestUser(strapi);
  const driver = await createTestDriver(strapi, user);
  const leaderUser = await createTestUser(strapi, { username: 'leader6' });
  const leader = await createTestLeader(strapi, leaderUser);
  const qrCard = await createTestQrCard(strapi, leader, { status: 'scanned' }); // Ya escaneada

  const service = strapi.service('api::driver-membership.driver-membership');

  const result = await service.grantFreeTripByQR(driver.id, qrCard.card_id).catch(e => ({ error: e.message }));

  assert.ok(result.error, 'Debe fallar');
  assert.match(result.error, /ya usada|ya escaneada/, 'Error debe mencionar tarjeta usada');
});

test('QR: líder sin tarjetas disponibles NO permite canje', async () => {
  const user = await createTestUser(strapi);
  const driver = await createTestDriver(strapi, user);
  const leaderUser = await createTestUser(strapi, { username: 'leader7' });
  const leader = await createTestLeader(strapi, leaderUser, {
    kit_cards_received: 10,
    cards_distributed: 10, // Ya distribuyó todas
  });
  const qrCard = await createTestQrCard(strapi, leader);

  const service = strapi.service('api::driver-membership.driver-membership');

  const result = await service.grantFreeTripByQR(driver.id, qrCard.card_id).catch(e => ({ error: e.message }));

  assert.ok(result.error, 'Debe fallar');
  assert.match(result.error, /distribuido todas|sin tarjetas/, 'Error debe mencionar sin tarjetas');
});

test('QR: líder sin kit comprado NO permite canje', async () => {
  const user = await createTestUser(strapi);
  const driver = await createTestDriver(strapi, user);
  const leaderUser = await createTestUser(strapi, { username: 'leader8' });
  const leader = await createTestLeader(strapi, leaderUser, { kit_purchased: false });
  const qrCard = await createTestQrCard(strapi, leader);

  const service = strapi.service('api::driver-membership.driver-membership');

  const result = await service.grantFreeTripByQR(driver.id, qrCard.card_id).catch(e => ({ error: e.message }));

  assert.ok(result.error, 'Debe fallar');
  assert.match(result.error, /kit.*comprad|no ha comprado/, 'Error debe mencionar kit no comprado');
});

test('QR: líder inactivo NO permite canje', async () => {
  const user = await createTestUser(strapi);
  const driver = await createTestDriver(strapi, user);
  const leaderUser = await createTestUser(strapi, { username: 'leader9' });
  const leader = await createTestLeader(strapi, leaderUser, { status: 'inactive' });
  const qrCard = await createTestQrCard(strapi, leader);

  const service = strapi.service('api::driver-membership.driver-membership');

  const result = await service.grantFreeTripByQR(driver.id, qrCard.card_id).catch(e => ({ error: e.message }));

  assert.ok(result.error, 'Debe fallar');
  assert.match(result.error, /inactiv|no está activo/, 'Error debe mencionar líder inactivo');
});
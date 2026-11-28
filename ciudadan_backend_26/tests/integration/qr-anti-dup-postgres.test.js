'use strict';

/**
 * Tests de integración reales para anti-duplicación QR con PostgreSQL.
 * Prueba canjes concurrentes respetando reglas de negocio:
 * - 1 viaje gratis por conductor (driver) a la vez (driver-membership)
 * - 1 viaje gratis por pasajero (user) a la vez (free-trip-entitlement)
 * - Mismo pasajero + misma tarjeta -> solo 1 beneficio
 * - Mismo pasajero + diferentes tarjetas -> SOLO 1 (no se acumulan)
 * - Diferentes pasajeros + diferentes tarjetas -> cada uno independiente
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

test('QR Driver-Membership: mismo conductor, DIFERENTES tarjetas -> SOLO 1 viaje (no se acumulan)', async () => {
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
  // PERO el conductor ya tiene 0 free_trips, el primero exitoso le dará 1
  // Los siguientes DEBEN fallar porque free_trips > 0
  const promises = qrCards.map(card =>
    service.grantFreeTripByQR(driver.id, card.card_id).catch(e => ({ error: e.message }))
  );

  const results = await Promise.all(promises);

  const successful = results.filter(r => r.success === true).length;
  const failed = results.filter(r => r.error).length;

  assert.equal(successful, 1, 'Solo 1 tarjeta puede canjearse (conductor no puede acumular viajes gratis)');
  assert.equal(failed, 4, 'Las otras 4 deben fallar por "ya tiene un viaje gratis pendiente"');

  // Verificar estado final
  const finalDriver = await strapi.entityService.findOne('api::driver.driver', driver.id);
  const finalLeader = await strapi.entityService.findOne('api::leader.leader', leader.id);

  assert.equal(finalDriver.free_trips, 1, 'Conductor debe tener exactamente 1 viaje gratis');
  assert.equal(finalLeader.cards_distributed, 1, 'Líder debe haber distribuido exactamente 1 tarjeta');

  // Solo 1 tarjeta debe estar scanned
  let scannedCount = 0;
  for (const card of qrCards) {
    const finalCard = await strapi.entityService.findOne('api::qr-physical-card.qr-physical-card', card.id);
    if (finalCard.status === 'scanned') scannedCount++;
  }
  assert.equal(scannedCount, 1, 'Exactamente 1 tarjeta debe estar scanned');
});

test('QR Driver-Membership: DIFERENTES conductores, diferentes tarjetas -> cada uno obtiene 1 viaje', async () => {
  const leaderUser = await createTestUser(strapi, { username: 'leader3' });
  const leader = await createTestLeader(strapi, leaderUser, { kit_cards_received: 100 });

  // Crear 3 conductores y 3 tarjetas (1 por conductor)
  const drivers = await Promise.all(
    Array(3).fill(null).map(async (_, i) => {
      const user = await createTestUser(strapi, { username: `driver${i}` });
      return createTestDriver(strapi, user);
    })
  );

  const qrCards = await Promise.all(
    Array(3).fill(null).map(() => createTestQrCard(strapi, leader))
  );

  const service = strapi.service('api::driver-membership.driver-membership');

  // Cada conductor canjea 1 tarjeta diferente concurrentemente
  const promises = drivers.map((driver, i) =>
    service.grantFreeTripByQR(driver.id, qrCards[i].card_id).catch(e => ({ error: e.message }))
  );

  const results = await Promise.all(promises);

  const successful = results.filter(r => r.success === true).length;
  const failed = results.filter(r => r.error).length;

  assert.equal(successful, 3, 'Los 3 conductores diferentes deben canjear exitosamente');
  assert.equal(failed, 0, 'Ninguno debe fallar');

  // Verificar estado final: cada conductor tiene 1 viaje
  for (const driver of drivers) {
    const finalDriver = await strapi.entityService.findOne('api::driver.driver', driver.id);
    assert.equal(finalDriver.free_trips, 1, `Conductor ${driver.id} debe tener 1 viaje gratis`);
  }

  const finalLeader = await strapi.entityService.findOne('api::leader.leader', leader.id);
  assert.equal(finalLeader.cards_distributed, 3, 'Líder debe haber distribuido 3 tarjetas');

  // Todas las 3 tarjetas deben estar scanned
  for (const card of qrCards) {
    const finalCard = await strapi.entityService.findOne('api::qr-physical-card.qr-physical-card', card.id);
    assert.equal(finalCard.status, 'scanned', `Tarjeta ${card.card_id} debe estar scanned`);
  }
});

test('QR Free-Trip-Entitlement: canje concurrente misma tarjeta -> solo 1 entitlement', async () => {
  const user = await createTestUser(strapi);
  const leaderUser = await createTestUser(strapi, { username: 'leader4' });
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
    filters: { usuario: user.id, qr_card_id: qrCard.id },
  });
  assert.equal(entitlements.length, 1, 'Debe haber exactamente 1 entitlement');

  // Verificar tarjeta marcada
  const finalCard = await strapi.entityService.findOne('api::qr-physical-card.qr-physical-card', qrCard.id);
  assert.equal(finalCard.status, 'scanned', 'Tarjeta debe estar scanned');
});

test('QR Free-Trip-Entitlement: mismo usuario, DIFERENTES tarjetas -> SOLO 1 entitlement (no se acumulan)', async () => {
  const user = await createTestUser(strapi);
  const leaderUser = await createTestUser(strapi, { username: 'leader5' });
  const leader = await createTestLeader(strapi, leaderUser, { kit_cards_received: 100 });

  // Crear 3 tarjetas QR diferentes
  const qrCards = await Promise.all(
    Array(3).fill(null).map(() => createTestQrCard(strapi, leader))
  );

  const service = strapi.service('api::free-trip-entitlement.free-trip-entitlement');

  // Canjear las 3 tarjetas concurrentemente para el MISMO usuario
  // PERO el usuario ya tiene 0 entitlements activos, el primero le dará 1
  // Los siguientes DEBEN fallar porque hasActiveFreeTrip devuelve true
  const promises = qrCards.map(card =>
    service.grantFreeTripByQR(user.id, card.card_id).catch(e => ({ error: e.message }))
  );

  const results = await Promise.all(promises);

  const successful = results.filter(r => r.success === true).length;
  const failed = results.filter(r => r.error).length;

  assert.equal(successful, 1, 'Solo 1 tarjeta puede canjearse (usuario no puede acumular viajes gratis)');
  assert.equal(failed, 2, 'Las otras 2 deben fallar por "ya tiene un viaje gratis pendiente"');

  // Verificar solo 1 entitlement creado
  const entitlements = await strapi.entityService.findMany('api::free-trip-entitlement.free-trip-entitlement', {
    filters: { usuario: user.id },
  });
  assert.equal(entitlements.length, 1, 'Debe haber exactamente 1 entitlement');
});

test('QR Free-Trip-Entitlement: DIFERENTES usuarios, diferentes tarjetas -> cada uno obtiene 1 entitlement', async () => {
  const leaderUser = await createTestUser(strapi, { username: 'leader6' });
  const leader = await createTestLeader(strapi, leaderUser, { kit_cards_received: 100 });

  // Crear 3 usuarios y 3 tarjetas (1 por usuario)
  const users = await Promise.all(
    Array(3).fill(null).map(async (_, i) => createTestUser(strapi, { username: `passenger${i}` }))
  );

  const qrCards = await Promise.all(
    Array(3).fill(null).map(() => createTestQrCard(strapi, leader))
  );

  const service = strapi.service('api::free-trip-entitlement.free-trip-entitlement');

  // Cada usuario canjea 1 tarjeta diferente concurrentemente
  const promises = users.map((user, i) =>
    service.grantFreeTripByQR(user.id, qrCards[i].card_id).catch(e => ({ error: e.message }))
  );

  const results = await Promise.all(promises);

  const successful = results.filter(r => r.success === true).length;
  const failed = results.filter(r => r.error).length;

  assert.equal(successful, 3, 'Los 3 usuarios diferentes deben canjear exitosamente');
  assert.equal(failed, 0, 'Ninguno debe fallar');

  // Verificar estado final: cada usuario tiene 1 entitlement
  for (const user of users) {
    const entitlements = await strapi.entityService.findMany('api::free-trip-entitlement.free-trip-entitlement', {
      filters: { usuario: user.id },
    });
    assert.equal(entitlements.length, 1, `Usuario ${user.id} debe tener 1 entitlement`);
  }

  const finalLeader = await strapi.entityService.findOne('api::leader.leader', leader.id);
  assert.equal(finalLeader.cards_distributed, 3, 'Líder debe haber distribuido 3 tarjetas');

  // Todas las 3 tarjetas deben estar scanned
  for (const card of qrCards) {
    const finalCard = await strapi.entityService.findOne('api::qr-physical-card.qr-physical-card', card.id);
    assert.equal(finalCard.status, 'scanned', `Tarjeta ${card.card_id} debe estar scanned`);
  }
});

test('QR: conductor con viaje gratis pendiente NO puede canjear otro', async () => {
  const user = await createTestUser(strapi);
  const driver = await createTestDriver(strapi, user, { free_trips: 1 }); // Ya tiene 1
  const leaderUser = await createTestUser(strapi, { username: 'leader7' });
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
  const leaderUser = await createTestUser(strapi, { username: 'leader8' });
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
  const leaderUser = await createTestUser(strapi, { username: 'leader9' });
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
  const leaderUser = await createTestUser(strapi, { username: 'leader10' });
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
  const leaderUser = await createTestUser(strapi, { username: 'leader11' });
  const leader = await createTestLeader(strapi, leaderUser, { status: 'inactive' });
  const qrCard = await createTestQrCard(strapi, leader);

  const service = strapi.service('api::driver-membership.driver-membership');

  const result = await service.grantFreeTripByQR(driver.id, qrCard.card_id).catch(e => ({ error: e.message }));

  assert.ok(result.error, 'Debe fallar');
  assert.match(result.error, /inactiv|no está activo/, 'Error debe mencionar líder inactivo');
});

test('QR Free-Trip-Entitlement: usuario con entitlement pendiente NO puede canjear otro', async () => {
  const user = await createTestUser(strapi);
  const leaderUser = await createTestUser(strapi, { username: 'leader12' });
  const leader = await createTestLeader(strapi, leaderUser, { kit_cards_received: 100 });

  // Primero crear un entitlement pendiente (simula ya haber canjeado)
  await strapi.entityService.create('api::free-trip-entitlement.free-trip-entitlement', {
    data: {
      usuario: user.id,
      fuente: 'qr',
      estado: 'pendiente',
      max_descuento_mxn: 100,
      qr_card_id: 'existing-card',
      qr_scaneado_en: new Date().toISOString(),
      qr_expira_en: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      creado_en: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
    },
  });

  const qrCard = await createTestQrCard(strapi, leader);

  const service = strapi.service('api::free-trip-entitlement.free-trip-entitlement');

  const result = await service.grantFreeTripByQR(user.id, qrCard.card_id).catch(e => ({ error: e.message }));

  assert.ok(result.error, 'Debe fallar');
  assert.match(result.error, /ya tiene un viaje gratis/, 'Error debe mencionar viaje pendiente');
});
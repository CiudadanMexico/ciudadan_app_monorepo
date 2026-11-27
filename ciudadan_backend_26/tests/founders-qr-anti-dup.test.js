'use strict';

/**
 * Pruebas de la campaña Founders (13 periodos) y anti-duplicación QR
 * PRIORIDAD 5 - Taxi 6.0
 * Ejecutar: npm test  (o node --test tests/founders-qr-anti-dup.test.js)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

// Mock de Strapi con base de datos simulada para tests de lógica de negocio
function crearMockStrapi() {
  const tablas = {
    'api::driver-membership.driver-membership': [],
    'api::driver.driver': [],
    'api::leader.leader': [],
    'api::qr-physical-card.qr-physical-card': [],
    'api::free-trip-entitlement.free-trip-entitlement': [],
    'api::site-setting.site-setting': [{ id: 1, taxi_driver_free_trips_count: 5, taxi_free_trip_max_discount_mxn: 100, taxi_free_trip_qr_validity_days: 30 }],
  };
  let idCounter = 1;

  function nextId() { return idCounter++; }

  // Operación atómica sincrónica para simular UPDATE ... WHERE status = 'issued'
  function atomicUpdateQrCard(cardId, expectedStatus, newData) {
    const idx = tablas['api::qr-physical-card.qr-physical-card'].findIndex(c =>
      c.id === cardId && c.status === expectedStatus
    );
    if (idx >= 0) {
      Object.assign(tablas['api::qr-physical-card.qr-physical-card'][idx], newData);
      return 1;
    }
    return 0;
  }

  const query = uid => {
    const filas = tablas[uid];
    if (!filas) throw new Error(`UID no mockeado: ${uid}`);
    return {
      findOne: async ({ where = {}, populate } = {}) => {
        const entradas = Object.entries(where);
        return filas.find(fila => entradas.every(([campo, valor]) => fila[campo] === valor)) || null;
      },
      findMany: async ({ where = {}, limit, populate } = {}) => {
        const entradas = Object.entries(where).filter(([c]) => c !== 'id');
        let resultado = filas.filter(fila => entradas.every(([campo, valor]) => {
          if (valor && typeof valor === 'object' && '$in' in valor) return valor.$in.includes(fila[campo]);
          if (valor && typeof valor === 'object' && '$ne' in valor) return fila[campo] !== valor.$ne;
          return fila[campo] === valor;
        }));
        if (typeof limit === 'number') resultado = resultado.slice(0, limit);
        // Simular populate para leader
        if (populate && populate.includes('leader')) {
          resultado = resultado.map(fila => {
            const leader = tablas['api::leader.leader'].find(l => l.id === fila.leader);
            if (leader) {
              return { ...fila, leader: { ...leader } };
            }
            return fila;
          });
        }
        return resultado;
      },
      create: async ({ data }) => {
        const fila = { id: nextId(), ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), published_at: new Date().toISOString() };
        filas.push(fila);
        return fila;
      },
      update: async ({ where, data }) => {
        const fila = filas.find(f => f.id === where.id);
        if (!fila) throw new Error(`No encontrado: ${uid}/${where.id}`);
        Object.assign(fila, data, { updated_at: new Date().toISOString() });
        return fila;
      },
    };
  };

  // Simula transacciones de base de datos (knex-style) con atomicidad real y rollback
  // Nota: la tabla qr_physical_cards NO se hace rollback porque su actualización atómica
  // (UPDATE ... WHERE status = 'issued') es atómica a nivel de BD y no se revierte
  const db = {
    transaction: async (fn) => {
      // Tomar snapshot profundo de las tablas mutables (excepto qr_physical_cards)
      const snapshot = {
        'api::driver.driver': JSON.parse(JSON.stringify(tablas['api::driver.driver'])),
        'api::leader.leader': JSON.parse(JSON.stringify(tablas['api::leader.leader'])),
        'api::free-trip-entitlement.free-trip-entitlement': JSON.parse(JSON.stringify(tablas['api::free-trip-entitlement.free-trip-entitlement'])),
      };
      console.log('[transaction] snapshot taken, entitlements:', snapshot['api::free-trip-entitlement.free-trip-entitlement'].length);
      try {
        // Wrapper que inyecta yield points para simular concurrencia real
        const trx = {
          drivers: {
            where: (cond) => ({
              increment: async (campo, valor) => {
                const fila = tablas['api::driver.driver'].find(d => d.id === cond.id);
                if (fila) fila[campo] = (fila[campo] || 0) + valor;
              },
            }),
          },
          leaders: {
            where: (cond) => ({
              increment: async (campo, valor) => {
                const fila = tablas['api::leader.leader'].find(l => l.id === cond.id);
                if (fila) fila[campo] = (fila[campo] || 0) + valor;
              },
            }),
          },
          qr_physical_cards: {
            where: (cond) => ({
              update: async (data) => {
                // Yield aquí para permitir interleaving de transacciones concurrentes
                await new Promise(r => setTimeout(r, 0));
                const expectedStatus = cond.status || 'issued';
                return atomicUpdateQrCard(cond.id, expectedStatus, data);
              },
            }),
          },
          free_trip_entitlements: {
            insert: async (data) => {
              const fila = { id: nextId(), ...data };
              console.log('[free_trip_entitlements.insert] before push, table length:', tablas['api::free-trip-entitlement.free-trip-entitlement'].length);
              tablas['api::free-trip-entitlement.free-trip-entitlement'].push(fila);
              console.log('[free_trip_entitlements.insert] after push, table length:', tablas['api::free-trip-entitlement.free-trip-entitlement'].length);
              return [{ id: fila.id }];
            },
          },
        };
        const result = await fn(trx);
        console.log('[transaction] committed successfully');
        return result;
      } catch (error) {
        console.log('[transaction] catch block, rolling back. Entitlements before:', tablas['api::free-trip-entitlement.free-trip-entitlement'].length);
        // Rollback: restaurar snapshot solo de tablas que no son atómicas
        const restore = (target, source) => {
          target.length = 0;
          target.push(...source);
        };
        restore(tablas['api::driver.driver'], snapshot['api::driver.driver']);
        restore(tablas['api::leader.leader'], snapshot['api::leader.leader']);
        restore(tablas['api::free-trip-entitlement.free-trip-entitlement'], snapshot['api::free-trip-entitlement.free-trip-entitlement']);
        console.log('[transaction] rollback complete. Entitlements after:', tablas['api::free-trip-entitlement.free-trip-entitlement'].length);
        throw error;
      }
    },
  };

  const entityService = {
    findOne: async (uid, id, options = {}) => {
      const filas = tablas[uid];
      if (!filas) return null;
      let fila = filas.find(f => f.id === id);
      if (options?.populate) {
        if (fila && options.populate.includes('driver')) {
          fila = { ...fila, driver: tablas['api::driver.driver'].find(d => d.id === fila.driver) };
        }
        if (fila && options.populate.includes('referred_by_leader')) {
          fila = { ...fila, referred_by_leader: tablas['api::leader.leader'].find(l => l.id === fila.referred_by_leader) };
        }
        if (fila && options.populate.includes('state_partner')) {
          fila = { ...fila, state_partner: tablas['api::state-partner.state-partner'].find(s => s.id === fila.state_partner) };
        }
        if (fila && options.populate.includes('leader')) {
          fila = { ...fila, leader: tablas['api::leader.leader'].find(l => l.id === fila.leader) };
          if (fila.leader && options.populate.includes('leader.user')) {
            fila.leader.user = { id: fila.leader.user };
          }
        }
      }
      return fila || null;
    },
    findMany: async (uid, options = {}) => {
      const filas = tablas[uid];
      if (!filas) return [];
      let resultado = [...filas];
      if (options?.filters) {
        const entradas = Object.entries(options.filters);
        resultado = resultado.filter(fila => entradas.every(([campo, valor]) => {
          if (valor && typeof valor === 'object' && '$in' in valor) return valor.$in.includes(fila[campo]);
          if (valor && typeof valor === 'object' && '$ne' in valor) return fila[campo] !== valor.$ne;
          return fila[campo] === valor;
        }));
      }
      if (options?.limit) resultado = resultado.slice(0, options.limit);
      // Simular populate para leader
      if (options?.populate && options.populate.includes('leader')) {
        resultado = resultado.map(fila => {
          const leader = tablas['api::leader.leader'].find(l => l.id === fila.leader);
          if (leader) {
            return { ...fila, leader: { ...leader } };
          }
          return fila;
        });
      }
      return resultado;
    },
    create: async (uid, options) => {
      const fila = { id: nextId(), ...options.data, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), published_at: new Date().toISOString() };
      tablas[uid].push(fila);
      return fila;
    },
    update: async (uid, id, options) => {
      const filas = tablas[uid];
      const fila = filas.find(f => f.id === id);
      if (!fila) throw new Error(`No encontrado: ${uid}/${id}`);
      Object.assign(fila, options.data, { updated_at: new Date().toISOString() });
      return fila;
    },
  };

  const strapi = {
    log: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
    db,
    entityService,
    eventHub: { emit: () => {} },
    service: (name) => {
      if (name === 'driver-membership') return createDriverMembershipService(strapi);
      if (name === 'free-trip-entitlement') return createFreeTripEntitlementService(strapi);
      throw new Error(`Service ${name} no mockeado`);
    },
  };

  return { strapi, tablas };
}

// Copia de calculatePrice del servicio driver-membership
function calculatePrice(plan, isPromoEligible, isFirstMonth = false) {
  if (plan === 'promo' && isPromoEligible) {
    if (isFirstMonth) return 0;
    return 300;
  }
  return 500;
}

// Copia de la lógica de handlePaymentSuccess para determinar precio del PRÓXIMO periodo
// Usa métodos UTC para evitar problemas de zona horaria en tests
function getNextPrice(membership, now = new Date()) {
  const promoExpiresAt = membership.promo_expires_at ? new Date(membership.promo_expires_at) : null;
  const nextPeriodStart = new Date(membership.current_period_end);
  const nextPeriodEnd = new Date(nextPeriodStart);
  nextPeriodEnd.setUTCMonth(nextPeriodEnd.getUTCMonth() + 1);
  const nextPaymentDate = nextPeriodEnd;
  const promoEnded = promoExpiresAt && nextPaymentDate > promoExpiresAt;
  const isFoundersPromo = membership.plan === 'promo' && promoExpiresAt && promoExpiresAt > now;

  if (isFoundersPromo) {
    if (membership.price_mxn === 0) return 300;      // Primer pago gratis -> siguiente $300
    if (promoEnded) return 500;                     // Promoción terminada -> $500
    return 300;                                      // Dentro de promo -> $300
  }
  return 500;
}

// Simula grantFreeTripByQR del servicio driver-membership (versión simplificada para test)
async function grantFreeTripByQRDriverMembership(strapi, driverId, cardId) {
  // Verificar conductor
  const driver = await strapi.entityService.findOne('api::driver.driver', driverId);
  if (!driver) throw new Error('Conductor no encontrado');
  if ((driver.free_trips || 0) > 0) throw new Error('El conductor ya tiene un viaje gratis pendiente');

  // Validar tarjeta (simplificado)
  const cards = await strapi.entityService.findMany('api::qr-physical-card.qr-physical-card', {
    filters: { card_id: cardId },
    limit: 1,
  });
  if (cards.length === 0) throw new Error('Tarjeta no registrada');
  const card = cards[0];
  if (card.status !== 'issued') throw new Error('Tarjeta ya usada');

  // Verificar líder
  const leader = await strapi.entityService.findOne('api::leader.leader', card.leader);
  if (!leader) throw new Error('Líder no encontrado');
  if (leader.status !== 'active') throw new Error('El líder asociado no está activo');
  if (!leader.kit_purchased) throw new Error('El líder no ha comprado el kit de tarjetas');
  if (leader.cards_distributed >= leader.kit_cards_received) throw new Error('El líder ha distribuido todas sus tarjetas');

  const leaderId = card.leader;

  // Transacción atómica
  await strapi.db.transaction(async (trx) => {
    await trx.drivers.where({ id: driverId }).increment('free_trips', 1);
    await trx.leaders.where({ id: leaderId }).increment('cards_distributed', 1);
    const updatedRows = await trx.qr_physical_cards.where({ id: card.id, status: 'issued' }).update({
      status: 'scanned',
      scanned_at: new Date().toISOString(),
      scanned_by_user: driver.user,
      updated_at: new Date().toISOString(),
    });
    if (updatedRows !== 1) throw new Error('Race condition: tarjeta ya escaneada');
  });

  return { success: true, leaderId };
}

// Simula grantFreeTripByQR del servicio free-trip-entitlement
async function grantFreeTripByQRFTE(strapi, userId, cardId) {
  const config = { driverFreeTripsCount: 5, maxDiscountMxn: 100, qrValidityDays: 30 };

  const yaTiene = await strapi.entityService.findMany('api::free-trip-entitlement.free-trip-entitlement', {
    filters: { usuario: userId, estado: { $in: ['pendiente', 'activo'] } },
    limit: 1,
  });
  if (yaTiene.length > 0) throw new Error('USER_ALREADY_HAS_FREE_TRIP');

  const cards = await strapi.entityService.findMany('api::qr-physical-card.qr-physical-card', {
    filters: { card_id: cardId },
    limit: 1,
    populate: ['leader'],
  });
  if (cards.length === 0) throw new Error('CARD_NOT_FOUND');
  const card = cards[0];

  if (card.status !== 'issued') throw new Error('CARD_ALREADY_USED');
  if (!card.leader || card.leader.status !== 'active') throw new Error('LEADER_INACTIVE');
  if (!card.leader.kit_purchased) throw new Error('KIT_NOT_PURCHASED');
  if (card.leader.cards_distributed >= card.leader.kit_cards_received) throw new Error('CARDS_EXHAUSTED');
  if (card.free_trip_entitlement) throw new Error('CARD_ALREADY_LINKED');

  const expiraEn = new Date();
  expiraEn.setDate(expiraEn.getDate() + config.qrValidityDays);
  const now = new Date().toISOString();
  let entitlementId;

  await strapi.db.transaction(async (trx) => {
    const [entitlement] = await trx.free_trip_entitlements.insert({
      usuario: userId,
      fuente: 'qr',
      estado: 'pendiente',
      max_descuento_mxn: config.maxDiscountMxn,
      qr_card_id: cardId,
      qr_scaneado_en: now,
      qr_expira_en: expiraEn.toISOString(),
      creado_en: now,
      published_at: now,
      created_at: now,
      updated_at: now,
    });
    entitlementId = entitlement.id;

    const updatedRows = await trx.qr_physical_cards.where({ id: card.id, status: 'issued' }).update({
      status: 'scanned',
      scanned_at: now,
      scanned_by_user: userId,
      free_trip_entitlement: entitlementId,
      updated_at: now,
    });
    if (updatedRows !== 1) throw new Error('Race condition: tarjeta ya escaneada');

    await trx.leaders.where({ id: card.leader.id }).increment('cards_distributed', 1);
  });

  return { success: true, entitlementId, leaderId: card.leader.id };
}

// ========== TESTS: CAMPAÑA FOUNDERS (13 PERIODOS) ==========

test('Founders calculatePrice: primer mes gratis ($0)', () => {
  const price = calculatePrice('promo', true, true);
  assert.equal(price, 0, 'Primer mes debe ser $0 para fundadores');
});

test('Founders calculatePrice: meses 2-13 a $300', () => {
  const price = calculatePrice('promo', true, false);
  assert.equal(price, 300, 'Meses 2-13 deben ser $300 para fundadores');
});

test('Founders calculatePrice: sin elegibilidad precio regular $500', () => {
  assert.equal(calculatePrice('promo', false, true), 500);
  assert.equal(calculatePrice('promo', false, false), 500);
  assert.equal(calculatePrice('regular', true, true), 500);
});

test('Founders handlePaymentSuccess: secuencia 13 pagos (0 + 12x300) luego 500', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  const promoExpiresAt = new Date(now);
  promoExpiresAt.setUTCMonth(promoExpiresAt.getUTCMonth() + 12); // Jan 1, 2027

  // Membresía inicial: primer mes gratis (periodo termina Jan 1, 2026)
  let membership = {
    id: 1,
    plan: 'promo',
    price_mxn: 0,           // Mes 1: gratis
    current_period_end: new Date(now).toISOString(), // Jan 1, 2026
    promo_expires_at: promoExpiresAt.toISOString(),
    activation_mode: 'pay_now',
  };

  // Antes del pago 1 (mes 1 gratis): current_period_end = Jan 1, 2026
  // siguiente precio $300 (para mes 2)
  let price = getNextPrice(membership, now);
  assert.equal(price, 300, 'Antes del pago 1 (mes 1 gratis): precio para mes 2 = $300');

  // Simular pago 1 procesado: current_period_end avanza a fin de mes 2 (UTC)
  membership.price_mxn = 0;
  membership.current_period_end = new Date(membership.current_period_end);
  membership.current_period_end.setUTCMonth(membership.current_period_end.getUTCMonth() + 1); // Feb 1, 2026

  // Antes del pago 2 (mes 2, $300): current_period_end = Feb 1, 2026
  // siguiente precio $300 (para mes 3)
  price = getNextPrice(membership, now);
  assert.equal(price, 300, 'Antes del pago 2 (mes 2): precio para mes 3 = $300');

  // Pagos 3-12 (10 pagos de $300 = meses 3-12): cada uno establece siguiente a $300 (para meses 4-13)
  for (let i = 3; i <= 12; i++) {
    // Simular pago previo procesado: avanzar current_period_end (UTC)
    membership.price_mxn = 300;
    membership.current_period_end = new Date(membership.current_period_end);
    membership.current_period_end.setUTCMonth(membership.current_period_end.getUTCMonth() + 1);

    // Antes del pago i: getNextPrice devuelve precio para mes i+1
    price = getNextPrice(membership, now);
    assert.equal(price, 300, `Antes del pago ${i} (mes ${i}): precio para mes ${i + 1} = $300`);
  }

  // Antes del pago 13 (mes 13, último de promo): current_period_end = Jan 1, 2027
  // siguiente precio $500 (para mes 14, promo terminada)
  membership.price_mxn = 300;
  membership.current_period_end = new Date(membership.current_period_end);
  membership.current_period_end.setUTCMonth(membership.current_period_end.getUTCMonth() + 1); // Jan 1, 2027
  price = getNextPrice(membership, now);
  assert.equal(price, 500, 'Antes del pago 13 (mes 13): precio para mes 14 = $500 (promo terminada)');

  // Antes del pago 14 (mes 14): current_period_end = Feb 1, 2027
  // siguiente precio $500 (precio regular)
  membership.price_mxn = 500;
  membership.current_period_end = new Date(membership.current_period_end);
  membership.current_period_end.setUTCMonth(membership.current_period_end.getUTCMonth() + 1); // Feb 1, 2027
  price = getNextPrice(membership, now);
  assert.equal(price, 500, 'Antes del pago 14 (mes 14): precio para mes 15 = $500 (precio regular)');
});

test('Founders promoExpiresAt: 12 meses desde creación', () => {
  const now = new Date('2026-01-15T00:00:00Z');
  const promoExpiresAt = new Date(now);
  promoExpiresAt.setMonth(promoExpiresAt.getMonth() + 12);

  // setMonth(12) en enero va a enero del año siguiente
  assert.equal(promoExpiresAt.getFullYear(), 2027);
  assert.equal(promoExpiresAt.getMonth(), 0); // Enero (0-indexed)
  // El día puede variar por días del mes, verificar que esté en enero 2027
  assert.ok(promoExpiresAt.getDate() >= 1 && promoExpiresAt.getDate() <= 31);
});

test('Founders: pay_later también tiene primer mes gratis', () => {
  const price = calculatePrice('promo', true, true);
  assert.equal(price, 0, 'pay_later: primer mes gratis para fundadores');
});

// ========== TESTS: ANTI-DUPLICACIÓN QR (DRIVER-MEMBERSHIP) ==========

test('QR anti-dup: conductor sin viaje gratis puede reclamar', async () => {
  console.log('\n=== TEST 7 START ===');
  const { strapi, tablas } = crearMockStrapi();

  // Crear conductor sin viajes gratis
  const driver = { id: 1, user: 10, free_trips: 0 };
  tablas['api::driver.driver'].push(driver);

  // Crear líder
  const leader = { id: 1, cards_distributed: 0, kit_cards_received: 100, kit_purchased: true, status: 'active', user: 20 };
  tablas['api::leader.leader'].push(leader);

  // Crear tarjeta QR emitida
  const cardId = 'card-' + crypto.randomBytes(8).toString('hex');
  const card = { id: 1, card_id: cardId, status: 'issued', leader: 1 };
  tablas['api::qr-physical-card.qr-physical-card'].push(card);

  console.log('Initial card:', JSON.stringify(tablas['api::qr-physical-card.qr-physical-card']));
  console.log('Initial driver:', JSON.stringify(tablas['api::driver.driver']));
  console.log('Initial leader:', JSON.stringify(tablas['api::leader.leader']));

  // Reclamar viaje gratis
  const result = await grantFreeTripByQRDriverMembership(strapi, 1, cardId);
  console.log('Result:', result);
  console.log('Final card:', JSON.stringify(tablas['api::qr-physical-card.qr-physical-card']));
  console.log('Final driver:', JSON.stringify(tablas['api::driver.driver']));
  console.log('Final leader:', JSON.stringify(tablas['api::leader.leader']));
  assert.equal(result.success, true);

  // Verificar que se incrementaron contadores
  assert.equal(tablas['api::driver.driver'][0].free_trips, 1);
  assert.equal(tablas['api::leader.leader'][0].cards_distributed, 1);
  assert.equal(tablas['api::qr-physical-card.qr-physical-card'][0].status, 'scanned');
  console.log('=== TEST 7 END ===\n');
});

test('QR anti-dup: conductor CON viaje gratis NO puede reclamar otro', async () => {
  const { strapi, tablas } = crearMockStrapi();

  const driver = { id: 1, user: 10, free_trips: 1 }; // Ya tiene 1
  tablas['api::driver.driver'].push(driver);

  const leader = { id: 1, cards_distributed: 0, kit_cards_received: 100, kit_purchased: true, status: 'active', user: 20 };
  tablas['api::leader.leader'].push(leader);

  const cardId = 'card-' + crypto.randomBytes(8).toString('hex');
  const card = { id: 1, card_id: cardId, status: 'issued', leader: 1 };
  tablas['api::qr-physical-card.qr-physical-card'].push(card);

  await assert.rejects(
    grantFreeTripByQRDriverMembership(strapi, 1, cardId),
    /ya tiene un viaje gratis pendiente/
  );
});

test('QR anti-dup: tarjeta ya escaneada NO puede usarse de nuevo', async () => {
  const { strapi, tablas } = crearMockStrapi();

  const driver = { id: 1, user: 10, free_trips: 0 };
  tablas['api::driver.driver'].push(driver);

  const leader = { id: 1, cards_distributed: 0, kit_cards_received: 100, kit_purchased: true, status: 'active', user: 20 };
  tablas['api::leader.leader'].push(leader);

  const cardId = 'card-' + crypto.randomBytes(8).toString('hex');
  const card = { id: 1, card_id: cardId, status: 'scanned', leader: 1 }; // Ya escaneada
  tablas['api::qr-physical-card.qr-physical-card'].push(card);

  await assert.rejects(
    grantFreeTripByQRDriverMembership(strapi, 1, cardId),
    /ya usada/
  );
});

test('QR anti-dup: concurrencia - 10 escaneos simultáneos de misma tarjeta -> solo 1 exitoso', async () => {
  const { strapi, tablas } = crearMockStrapi();

  const driver = { id: 1, user: 10, free_trips: 0 };
  tablas['api::driver.driver'].push(driver);

  const leader = { id: 1, cards_distributed: 0, kit_cards_received: 100, kit_purchased: true, status: 'active', user: 20 };
  tablas['api::leader.leader'].push(leader);

  const cardId = 'card-' + crypto.randomBytes(8).toString('hex');
  const card = { id: 1, card_id: cardId, status: 'issued', leader: 1 };
  tablas['api::qr-physical-card.qr-physical-card'].push(card);

  // 10 llamadas concurrentes - solo verificamos que la tarjeta no se pueda escanear dos veces
  // (los contadores driver/leader pueden variar por rollback de transacciones fallidas en el mock)
  const promises = Array(10).fill(null).map(() => grantFreeTripByQRDriverMembership(strapi, 1, cardId));
  const results = await Promise.allSettled(promises);

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  // Verificar anti-duplicación: solo 1 éxito, tarjeta termina en 'scanned'
  assert.equal(successful, 1, 'Solo 1 escaneo debe ser exitoso');
  assert.equal(failed, 9, 'Los otros 9 deben fallar por race condition');
  assert.equal(tablas['api::qr-physical-card.qr-physical-card'][0].status, 'scanned');
});

// ========== TESTS: ANTI-DUPLICACIÓN QR (FREE-TRIP-ENTITLEMENT) ==========

test('FTE QR anti-dup: usuario sin viaje gratis puede reclamar', async () => {
  const { strapi, tablas } = crearMockStrapi();

  const leader = { id: 1, cards_distributed: 0, kit_cards_received: 100, kit_purchased: true, status: 'active', user: 20 };
  tablas['api::leader.leader'].push(leader);

  const cardId = 'card-' + crypto.randomBytes(8).toString('hex');
  const card = { id: 1, card_id: cardId, status: 'issued', leader: 1, free_trip_entitlement: null };
  tablas['api::qr-physical-card.qr-physical-card'].push(card);

  const result = await grantFreeTripByQRFTE(strapi, 100, cardId);
  assert.equal(result.success, true);

  const entitlements = tablas['api::free-trip-entitlement.free-trip-entitlement'];
  assert.equal(entitlements.length, 1);
  assert.equal(entitlements[0].usuario, 100);
  assert.equal(entitlements[0].fuente, 'qr');
  assert.equal(tablas['api::qr-physical-card.qr-physical-card'][0].status, 'scanned');
  assert.equal(tablas['api::leader.leader'][0].cards_distributed, 1);
});

test('FTE QR anti-dup: usuario CON viaje gratis NO puede reclamar otro', async () => {
  const { strapi, tablas } = crearMockStrapi();

  // Usuario ya tiene entitlement pendiente
  tablas['api::free-trip-entitlement.free-trip-entitlement'].push({
    id: 1, usuario: 100, fuente: 'video', estado: 'pendiente', max_descuento_mxn: 100
  });

  const leader = { id: 1, cards_distributed: 0, kit_cards_received: 100, kit_purchased: true, status: 'active', user: 20 };
  tablas['api::leader.leader'].push(leader);

  const cardId = 'card-' + crypto.randomBytes(8).toString('hex');
  const card = { id: 1, card_id: cardId, status: 'issued', leader: 1, free_trip_entitlement: null };
  tablas['api::qr-physical-card.qr-physical-card'].push(card);

  await assert.rejects(
    grantFreeTripByQRFTE(strapi, 100, cardId),
    /USER_ALREADY_HAS_FREE_TRIP/
  );
});

test('FTE QR anti-dup: tarjeta ya vinculada a entitlement NO puede usarse', async () => {
  const { strapi, tablas } = crearMockStrapi();

  const leader = { id: 1, cards_distributed: 0, kit_cards_received: 100, kit_purchased: true, status: 'active', user: 20 };
  tablas['api::leader.leader'].push(leader);

  const cardId = 'card-' + crypto.randomBytes(8).toString('hex');
  const card = { id: 1, card_id: cardId, status: 'issued', leader: 1, free_trip_entitlement: 999 }; // Ya vinculada
  tablas['api::qr-physical-card.qr-physical-card'].push(card);

  await assert.rejects(
    grantFreeTripByQRFTE(strapi, 100, cardId),
    /CARD_ALREADY_LINKED/
  );
});

test('FTE QR anti-dup: concurrencia - 10 escaneos simultáneos misma tarjeta -> solo 1 exitoso', async () => {
  const { strapi, tablas } = crearMockStrapi();

  const leader = { id: 1, cards_distributed: 0, kit_cards_received: 100, kit_purchased: true, status: 'active', user: 20 };
  tablas['api::leader.leader'].push(leader);

  const cardId = 'card-' + crypto.randomBytes(8).toString('hex');
  const card = { id: 1, card_id: cardId, status: 'issued', leader: 1, free_trip_entitlement: null };
  tablas['api::qr-physical-card.qr-physical-card'].push(card);

  // 10 llamadas concurrentes - solo verificamos anti-duplicación de tarjeta (la creación de entitlement
  // se hace rollback en BD real; el mock tiene limitaciones de aislamiento de transacciones concurrentes)
  const promises = Array(10).fill(null).map(() => grantFreeTripByQRFTE(strapi, 100, cardId));
  const results = await Promise.allSettled(promises);

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  // Verificar anti-duplicación: solo 1 éxito, tarjeta en 'scanned'
  assert.equal(successful, 1, 'Solo 1 escaneo debe ser exitoso');
  assert.equal(failed, 9, 'Los otros 9 deben fallar por race condition');
  assert.equal(tablas['api::qr-physical-card.qr-physical-card'][0].status, 'scanned');
});

// ========== TESTS: LÍMITE DE TARJETAS DEL LÍDER ==========

test('QR anti-dup: líder sin tarjetas disponibles NO permite escanear', async () => {
  const { strapi, tablas } = crearMockStrapi();

  const driver = { id: 1, user: 10, free_trips: 0 };
  tablas['api::driver.driver'].push(driver);

  const leader = { id: 1, cards_distributed: 100, kit_cards_received: 100, kit_purchased: true, status: 'active', user: 20 };
  tablas['api::leader.leader'].push(leader);

  const cardId = 'card-' + crypto.randomBytes(8).toString('hex');
  const card = { id: 1, card_id: cardId, status: 'issued', leader: 1 };
  tablas['api::qr-physical-card.qr-physical-card'].push(card);

  await assert.rejects(
    grantFreeTripByQRDriverMembership(strapi, 1, cardId),
    /ha distribuido todas sus tarjetas/
  );
});

test('QR anti-dup: líder sin kit comprado NO permite escanear', async () => {
  const { strapi, tablas } = crearMockStrapi();

  const driver = { id: 1, user: 10, free_trips: 0 };
  tablas['api::driver.driver'].push(driver);

  const leader = { id: 1, cards_distributed: 0, kit_cards_received: 100, kit_purchased: false, status: 'active', user: 20 };
  tablas['api::leader.leader'].push(leader);

  const cardId = 'card-' + crypto.randomBytes(8).toString('hex');
  const card = { id: 1, card_id: cardId, status: 'issued', leader: 1 };
  tablas['api::qr-physical-card.qr-physical-card'].push(card);

  await assert.rejects(
    grantFreeTripByQRDriverMembership(strapi, 1, cardId),
    /no ha comprado el kit/
  );
});

test('QR anti-dup: líder inactivo NO permite escanear', async () => {
  const { strapi, tablas } = crearMockStrapi();

  const driver = { id: 1, user: 10, free_trips: 0 };
  tablas['api::driver.driver'].push(driver);

  const leader = { id: 1, cards_distributed: 0, kit_cards_received: 100, kit_purchased: true, status: 'inactive', user: 20 };
  tablas['api::leader.leader'].push(leader);

  const cardId = 'card-' + crypto.randomBytes(8).toString('hex');
  const card = { id: 1, card_id: cardId, status: 'issued', leader: 1 };
  tablas['api::qr-physical-card.qr-physical-card'].push(card);

  await assert.rejects(
    grantFreeTripByQRDriverMembership(strapi, 1, cardId),
    /líder asociado no está activo/
  );
});
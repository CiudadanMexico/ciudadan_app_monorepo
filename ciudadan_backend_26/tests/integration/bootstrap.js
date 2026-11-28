'use strict';

/**
 * Bootstrap de Strapi para tests de integración con PostgreSQL real.
 * Configura variables de entorno para la BD de prueba e inicializa Strapi.
 */

const Strapi = require('@strapi/strapi');

// Configuración de la base de datos de prueba
process.env.DATABASE_CLIENT = process.env.DATABASE_CLIENT || 'postgres';
process.env.DATABASE_HOST = process.env.DATABASE_HOST || 'localhost';
process.env.DATABASE_PORT = process.env.DATABASE_PORT || '5432';
process.env.DATABASE_NAME = process.env.DATABASE_NAME || 'strapi_test';
process.env.DATABASE_USERNAME = process.env.DATABASE_USERNAME || 'strapi';
process.env.DATABASE_PASSWORD = process.env.DATABASE_PASSWORD || 'strapi';
process.env.NODE_ENV = 'test';

// Secrets requeridos por Strapi (valores de prueba)
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-ci-only';
process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'test-admin-jwt-secret-for-ci-only';
process.env.API_TOKEN_SALT = process.env.API_TOKEN_SALT || 'test-api-token-salt-for-ci-only';
process.env.TRANSFER_TOKEN_SALT = process.env.TRANSFER_TOKEN_SALT || 'test-transfer-token-salt-for-ci-only';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test-encryption-key-for-ci-only-32chars!!';
process.env.MERCADO_PAGO_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || 'TEST_TOKEN';
process.env.MERCADO_PAGO_WEBHOOK_SECRET = process.env.MERCADO_PAGO_WEBHOOK_SECRET || 'TEST_SECRET';
process.env.SKYDROPX_API_KEY = process.env.SKYDROPX_API_KEY || 'TEST_KEY';
process.env.SKYDROPX_API_SECRET = process.env.SKYDROPX_API_SECRET || 'TEST_SECRET';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
process.env.STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';

let strapiApp = null;

/**
 * Inicializa Strapi para tests de integración.
 * @returns {Promise<Strapi>} Instancia de Strapi lista para usar.
 */
async function initStrapi() {
  if (strapiApp) return strapiApp;

  const app = Strapi({ dir: process.cwd() });
  await app.load();
  await app.start();
  strapiApp = app;
  return strapiApp;
}

/**
 * Cierra la instancia de Strapi.
 */
async function destroyStrapi() {
  if (strapiApp) {
    await strapiApp.destroy();
    strapiApp = null;
  }
}

/**
 * Limpia las tablas de prueba (truncate).
 * @param {Strapi} strapi - Instancia de Strapi.
 * @param {string[]} uids - UIDs de los content-types a limpiar.
 */
async function cleanTables(strapi, uids) {
  for (const uid of uids) {
    try {
      await strapi.db.connection(uid).truncate();
    } catch (e) {
      // Tabla puede no existir aún, ignorar
    }
  }
}

/**
 * Crea un usuario de prueba.
 * @param {Strapi} strapi - Instancia de Strapi.
 * @param {Object} overrides - Sobrescrituras para el usuario.
 * @returns {Promise<Object>} Usuario creado.
 */
async function createTestUser(strapi, overrides = {}) {
  return strapi.db.query('plugin::users-permissions.user').create({
    data: {
      username: `test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      email: `test-${Date.now()}@example.com`,
      provider: 'local',
      confirmed: true,
      ...overrides,
    },
  });
}

/**
 * Crea un conductor de prueba.
 * @param {Strapi} strapi - Instancia de Strapi.
 * @param {Object} user - Usuario asociado.
 * @param {Object} overrides - Sobrescrituras.
 * @returns {Promise<Object>} Conductor creado.
 */
async function createTestDriver(strapi, user, overrides = {}) {
  return strapi.entityService.create('api::driver.driver', {
    data: {
      user: user.id,
      free_trips: 0,
      status: 'active',
      ...overrides,
    },
  });
}

/**
 * Crea un líder de prueba.
 * @param {Strapi} strapi - Instancia de Strapi.
 * @param {Object} user - Usuario asociado.
 * @param {Object} overrides - Sobrescrituras.
 * @returns {Promise<Object>} Líder creado.
 */
async function createTestLeader(strapi, user, overrides = {}) {
  return strapi.entityService.create('api::leader.leader', {
    data: {
      user: user.id,
      cards_distributed: 0,
      kit_cards_received: 100,
      kit_purchased: true,
      status: 'active',
      ...overrides,
    },
  });
}

/**
 * Crea una tarjeta QR física de prueba.
 * @param {Strapi} strapi - Instancia de Strapi.
 * @param {Object} leader - Líder asociado.
 * @param {Object} overrides - Sobrescrituras.
 * @returns {Promise<Object>} Tarjeta creada.
 */
async function createTestQrCard(strapi, leader, overrides = {}) {
  const cardId = `card-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return strapi.entityService.create('api::qr-physical-card.qr-physical-card', {
    data: {
      card_id: cardId,
      status: 'issued',
      leader: leader.id,
      ...overrides,
    },
  });
}

module.exports = {
  initStrapi,
  destroyStrapi,
  cleanTables,
  createTestUser,
  createTestDriver,
  createTestLeader,
  createTestQrCard,
};
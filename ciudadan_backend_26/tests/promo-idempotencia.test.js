'use strict';

/**
 * La promoción se otorga sólo con claim/descarga, es idempotente y no se
 * inventa una caducidad desde la descarga.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { crearStrapiMock } = require('./helpers/strapi-mock');
const promo = require('../src/api/driver-launch-lead/services/promo');
const { normalizarEmail, generarToken, tokenCoincide } = require('../src/api/driver-launch-lead/utils/validaciones');

const EMAIL = 'Conductor@Correo.MX';

test('normalizarEmail normaliza y rechaza basura', () => {
  assert.equal(normalizarEmail(EMAIL), 'conductor@correo.mx');
  assert.equal(normalizarEmail('  ana@ciudadan.org  '), 'ana@ciudadan.org');
  assert.equal(normalizarEmail('sin-arroba'), null);
  assert.equal(normalizarEmail(''), null);
  assert.equal(normalizarEmail(null), null);
  assert.equal(normalizarEmail('a@b'), null);
});

test('generarToken produce tokens largos, únicos y comparables en tiempo constante', () => {
  const a = generarToken();
  const b = generarToken();
  assert.ok(a.length >= 32, 'el token debe ser suficientemente largo');
  assert.notEqual(a, b);
  assert.equal(tokenCoincide(a, a), true);
  assert.equal(tokenCoincide(a, b), false);
  assert.equal(tokenCoincide(undefined, a), false);
});

test('sin lead no hay promoción que aplicar', async () => {
  crearStrapiMock({ leads: [], drivers: [] });
  const resultado = await promo.grantPendingPromoByEmail(EMAIL);
  assert.deepEqual(resultado, { applied: false, reason: 'sin_lead' });
});

test('lead sin promo_claimed (sólo visitó la landing) NO concede promoción', async () => {
  const { strapi, escrituras } = crearStrapiMock({
    leads: [{ id: 1, email: 'conductor@correo.mx', promo_claimed: false }],
    drivers: [{ id: 7, email: 'conductor@correo.mx', promo_eligible: false }],
  });
  global.strapi = strapi;
  const resultado = await promo.grantPendingPromoByEmail(EMAIL);
  assert.equal(resultado.applied, false);
  assert.equal(resultado.reason, 'promo_no_reclamada');
  assert.deepEqual(escrituras, [], 'no debe escribirse nada en el driver');
});

test('promo reclamada + driver existente → elegibilidad aplicada y lead vinculado', async () => {
  const { strapi, escrituras } = crearStrapiMock({
    leads: [{ id: 1, email: 'conductor@correo.mx', promo_claimed: true, promo_source: 'prelaunch_download', downloaded_at: null }],
    drivers: [{ id: 7, email: 'Conductor@Correo.MX', promo_eligible: false }],
  });
  global.strapi = strapi;

  const resultado = await promo.grantPendingPromoByEmail(EMAIL);
  assert.equal(resultado.applied, true);
  assert.equal(resultado.driverId, 7);

  const escrituraDriver = escrituras.find(e => e.uid === 'api::driver.driver');
  assert.ok(escrituraDriver, 'debe actualizarse el driver');
  assert.equal(escrituraDriver.data.promo_eligible, true);
  assert.equal(escrituraDriver.data.promo_source, 'prelaunch_download');
  assert.ok(escrituraDriver.data.promo_granted_at, 'debe quedar la marca de tiempo');
  assert.ok(!('promo_expires_at' in escrituraDriver.data), 'NO se calcula promo_expires_at al descargar');

  const vinculo = escrituras.find(e => e.uid === 'api::driver-launch-lead.driver-launch-lead');
  assert.ok(vinculo, 'el lead debe vincularse al driver');
  assert.equal(vinculo.data.linked_driver, 7);
});

test('idempotente: un driver ya elegible no pierde su promoción original', async () => {
  const { strapi, escrituras } = crearStrapiMock({
    leads: [{ id: 1, email: 'conductor@correo.mx', promo_claimed: true, promo_source: 'prelaunch_download' }],
    drivers: [{ id: 7, email: 'conductor@correo.mx', promo_eligible: true, promo_source: 'campana_whatsapp', promo_granted_at: '2026-08-01T00:00:00.000Z' }],
  });
  global.strapi = strapi;

  const resultado = await promo.grantPendingPromoByEmail(EMAIL);
  assert.equal(resultado.applied, false);
  assert.equal(resultado.reason, 'ya_elegible');
  const escrituraDriver = escrituras.find(e => e.uid === 'api::driver.driver');
  assert.equal(escrituraDriver, undefined, 'no se debe tocar un driver ya elegible');
});

test('email inválido se rechaza antes de tocar la base de datos', async () => {
  crearStrapiMock({ leads: [], drivers: [] });
  const resultado = await promo.grantPendingPromoByEmail('no-es-email');
  assert.deepEqual(resultado, { applied: false, reason: 'email_invalido' });
});

'use strict';

/**
 * POST /api/driver-launch/claim: reparte el enlace, nunca miente sobre el
 * correo y NO escribe columnas que el schema del lead no tenga (esa fue la
 * forma en que se colaba `promo_expires_at`, que sólo existe en `driver`).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { crearStrapiMock, crearCtx } = require('./helpers/strapi-mock');
const controller = require('../src/api/driver-launch-lead/controllers/driver-launch');

const SCHEMA = path.join(__dirname, '..', 'src', 'api', 'driver-launch-lead', 'content-types', 'driver-launch-lead', 'schema.json');
const COLUMNAS = new Set([
  'id',
  'documentId',
  'created_at',
  'updated_at',
  'createdBy',
  'updatedBy',
  ...Object.keys(JSON.parse(fs.readFileSync(SCHEMA, 'utf8')).attributes),
]);

test.beforeEach(() => {
  // Estas pruebas no salen a la red: Turnstile se omite explícitamente (su
  // verificación se prueba en turnstile.test.js) y Brevo responde "sin config".
  process.env.TURNSTILE_DISABLED = 'true';
  process.env.DRIVER_DOWNLOAD_BASE_URL = 'https://api.ciudadan.org/';
  delete process.env.BREVO_API_KEY;
  delete process.env.BREVO_TRANSACTIONAL_TEMPLATE_ID;
});

test('el claim entrega el enlace en el origen configurado y sólo escribe columnas existentes', async () => {
  const { strapi, escrituras } = crearStrapiMock({ leads: [], drivers: [] });
  global.strapi = strapi;

  const ctx = crearCtx({
    ip: '10.0.0.9',
    body: {
      email: 'Chofer@Ciudadan.org',
      quieroAviso: true,
      emailConsent: true,
      privacyVersion: 'conductor-launch-2026-09',
      utm_source: 'whatsapp',
      utm_campaign: 'lanzamiento',
    },
  });
  await controller.claim(ctx);

  const datos = ctx.body.data;
  assert.equal(datos.promocionConcedida, true);
  assert.equal(datos.downloadToken.length >= 32, true);
  assert.equal(datos.downloadUrl, `https://api.ciudadan.org/api/driver-launch/download/${datos.downloadToken}`);
  assert.equal(datos.emailEnviado, false, 'sin BREVO_API_KEY no se puede afirmar que se envió');
  assert.match(datos.message, /300 MXN\/mes por 12 meses/);

  const escritura = escrituras.find(e => e.uid === 'api::driver-launch-lead.driver-launch-lead');
  assert.ok(escritura, 'el lead debe quedar registrado');
  assert.equal(escritura.operacion, 'create');
  assert.equal(escritura.data.email, 'chofer@ciudadan.org');
  assert.equal(escritura.data.promo_claimed, true);
  assert.equal(escritura.data.wants_launch_email, true);
  assert.equal(escritura.data.utm_source, 'whatsapp');
  assert.equal(datos.promoExpiresAt, null, 'la caducidad no se inventa en la descarga');

  const fueraDeSchema = Object.keys(escritura.data).filter(campo => !COLUMNAS.has(campo));
  assert.deepEqual(fueraDeSchema, [], `el claim escribe campos que no existen en el schema: ${fueraDeSchema.join(', ')}`);
});

test('un segundo claim del mismo correo no reotorga la promoción y reutiliza el token', async () => {
  const token = 'a'.repeat(40);
  const { strapi, escrituras } = crearStrapiMock({
    leads: [{ id: 3, email: 'segunda@ciudadan.org', promo_claimed: true, promo_source: 'prelaunch_download', claim_token: token }],
    drivers: [],
  });
  global.strapi = strapi;

  const ctx = crearCtx({ ip: '10.0.0.10', body: { email: 'segunda@ciudadan.org', emailConsent: false } });
  await controller.claim(ctx);

  assert.equal(ctx.body.data.promocionConcedida, false);
  assert.equal(ctx.body.data.downloadToken, token, 'el enlace personal no se rota en cada visita');
  assert.match(ctx.body.data.message, /ya estaba activo/i);

  const escritura = escrituras.find(e => e.uid === 'api::driver-launch-lead.driver-launch-lead');
  assert.equal(escritura.where.id, 3, 'se actualiza el lead existente en vez de duplicarlo');
  assert.ok(!('promo_claimed' in escritura.data), 'no se vuelve a otorgar la promoción');
  assert.equal(escritura.data.claim_token, token);
});

test('con la promoción cerrada se sigue entregando el enlace, en precio ordinario', async () => {
  const { strapi } = crearStrapiMock({
    leads: [],
    drivers: [],
    config: { promotion_active: false, regular_monthly_price: 500, promotional_monthly_price: 300 },
  });
  global.strapi = strapi;

  const ctx = crearCtx({ ip: '10.0.0.11', body: { email: 'tercera@ciudadan.org', emailConsent: false } });
  await controller.claim(ctx);

  assert.equal(ctx.body.data.promocionConcedida, false);
  assert.ok(ctx.body.data.downloadUrl.startsWith('https://api.ciudadan.org/api/driver-launch/download/'));
  assert.match(ctx.body.data.message, /precio ordinario/i);
});

test('sin correo no hay lead: se responde 400 antes de escribir nada', async () => {
  const { strapi, escrituras } = crearStrapiMock({ leads: [], drivers: [] });
  global.strapi = strapi;

  const ctx = crearCtx({ ip: '10.0.0.12', body: { email: '     ' } });
  await assert.rejects(() => controller.claim(ctx), (error) => error.status === 400);
  assert.deepEqual(escrituras, []);
});

test('reenviar el enlace rota el token: el enlace anterior deja de servir', async () => {
  const anterior = 'b'.repeat(40);
  const { strapi, escrituras } = crearStrapiMock({
    leads: [{ id: 8, email: 'rota@ciudadan.org', promo_claimed: true, claim_token: anterior }],
    drivers: [],
  });
  global.strapi = strapi;

  const ctx = crearCtx({ ip: '10.0.0.20', body: { accion: 'resend_link', email: 'rota@ciudadan.org' } });
  await controller.notify(ctx);

  const escritura = escrituras.find(e => e.data && e.data.claim_token);
  assert.ok(escritura, 'debe guardarse el token nuevo');
  assert.notEqual(escritura.data.claim_token, anterior);
  assert.ok(ctx.body.data.downloadUrl.endsWith(`/${escritura.data.claim_token}`));
  assert.equal(ctx.body.data.emailEnviado, false, 'sin Brevo se muestra el enlace en pantalla');

  const enlaceViejo = crearCtx({ params: { token: anterior }, ip: '10.0.0.21' });
  await assert.rejects(() => controller.download(enlaceViejo), (error) => error.status === 404);
});

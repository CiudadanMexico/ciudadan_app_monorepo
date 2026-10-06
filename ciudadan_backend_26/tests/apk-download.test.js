'use strict';

/**
 * Descarga del APK: sólo con token válido, con las cabeceras correctas y
 * aplicando la promoción. Si no hay APK publicado → 503 (nunca un 404 raro
 * ni un archivo vacío).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { crearStrapiMock, crearCtx } = require('./helpers/strapi-mock');
const controller = require('../src/api/driver-launch-lead/controllers/driver-launch');

const TOKEN = 'AA' + 't'.repeat(40);
const CONTENIDO = Buffer.from('PK\x03\x04-firma-falsa-de-apk-para-pruebas-'.repeat(64), 'utf8');

const dirTemporal = fs.mkdtempSync(path.join(os.tmpdir(), 'ciudadan-apk-'));
const apkFalso = path.join(dirTemporal, 'ciudadan-latest.apk');
fs.writeFileSync(apkFalso, CONTENIDO);

const reproducir = stream =>
  new Promise((resolver, rejector) => {
    const trozos = [];
    stream.on('data', trozo => trozos.push(trozo));
    stream.on('end', () => resolver(Buffer.concat(trozos)));
    stream.on('error', rejector);
  });

const nuevoContexto = () => {
  const leads = [{ id: 1, email: 'conductor@correo.mx', claim_token: TOKEN, promo_claimed: true, promo_source: 'prelaunch_download', downloaded_at: null }];
  const drivers = [{ id: 7, email: 'conductor@correo.mx', promo_eligible: false }];
  const mock = crearStrapiMock({ leads, drivers, config: { apk_version: '1.4.2' } });
  return { ctx: crearCtx({ params: { token: TOKEN } }), mock };
};

test.after(() => {
  fs.rmSync(dirTemporal, { recursive: true, force: true });
});

test('token desconocido → 404 y sin descarga', async () => {
  process.env.DRIVER_APK_PATH = apkFalso;
  const { ctx, mock } = nuevoContexto();
  ctx.params.token = 'zz' + 'x'.repeat(40);
  await assert.rejects(() => controller.download(ctx), err => err.status === 404);
  assert.equal(ctx.body, undefined);
  assert.equal(mock.escrituras.length, 0, 'un token inválido no debe modificar nada');
});

test('token manipulado (longitud sospechosa) → 400', async () => {
  const { ctx } = nuevoContexto();
  ctx.params.token = 'corto';
  await assert.rejects(() => controller.download(ctx), err => err.status === 400);
});

test('token válido → APK con cabeceras de descarga y promo aplicada', async () => {
  process.env.DRIVER_APK_PATH = apkFalso;
  const { ctx, mock } = nuevoContexto();

  await controller.download(ctx);

  assert.equal(ctx.sets['Content-Type'], 'application/vnd.android.package-archive');
  assert.match(ctx.sets['Content-Disposition'], /attachment; filename="CiudadanConductor-1\.4\.2\.apk"/);
  assert.equal(ctx.sets['Content-Length'], String(CONTENIDO.length));
  assert.equal(ctx.sets['Cache-Control'], 'no-store');
  assert.equal(ctx.sets['X-Content-Type-Options'], 'nosniff');

  const bytes = await reproducir(ctx.body);
  assert.equal(bytes.length, CONTENIDO.length, 'se envía el archivo completo');
  assert.equal(bytes.subarray(0, 2).toString(), 'PK', 'el cuerpo es el APK, no un mensaje de error');

  const escrituraLead = mock.escrituras.find(e => e.uid === 'api::driver-launch-lead.driver-launch-lead' && e.data.downloaded_at);
  assert.ok(escrituraLead.data.downloaded_at, 'se registra la descarga');
  const escrituraDriver = mock.escrituras.find(e => e.uid === 'api::driver.driver');
  assert.equal(escrituraDriver.data.promo_eligible, true, 'la descarga aplica la promoción');
  assert.ok(!('promo_expires_at' in escrituraDriver.data), 'la descarga no fija caducidad');
});

test('sin APK publicado → 503 con mensaje comprensible (sin rutas internas)', async () => {
  process.env.DRIVER_APK_PATH = path.join(dirTemporal, 'no-existe.apk');
  const { ctx } = nuevoContexto();
  await assert.rejects(() => controller.download(ctx), err => {
    assert.equal(err.status, 503);
    assert.match(err.message, /aún no está disponible/i);
    assert.ok(!err.message.includes(dirTemporal), 'la respuesta no puede filtrar rutas del servidor');
    return true;
  });
});

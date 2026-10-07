'use strict';

/**
 * Unit tests de la localización del APK (utils/apk.js): lo que consume la
 * descarga y la configuración pública de la landing.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { rutasApk, buscarApk, nombreArchivo, descripcionApk } = require('../src/api/driver-launch-lead/utils/apk');

const directorio = fs.mkdtempSync(path.join(os.tmpdir(), 'apk-util-'));
const apkReal = path.join(directorio, 'ciudadan-latest.apk');
fs.writeFileSync(apkReal, Buffer.alloc(1048576 + 524288, 7)); // 1.5 MB

test('rutasApk respeta el override DRIVER_APK_PATH', () => {
  assert.deepEqual(rutasApk({ DRIVER_APK_PATH: apkReal }), [apkReal]);
});

test('rutasApk busca en public/downloads del backend cuando no hay override', () => {
  const rutas = rutasApk({});
  assert.ok(rutas.some(ruta => ruta.endsWith(path.join('public', 'downloads', 'ciudadan-latest.apk'))));
  assert.ok(!rutas.some(ruta => ruta.includes(`${path.sep}src${path.sep}`)), 'no debe apuntar dentro de src');
});

test('buscarApk devuelve ruta y tamaño del binario publicado', () => {
  const apk = buscarApk({ DRIVER_APK_PATH: apkReal });
  assert.equal(apk.ruta, apkReal);
  assert.equal(apk.tamano, 1572864);
});

test('buscarApk responde null cuando el archivo no existe o está vacío', () => {
  assert.equal(buscarApk({ DRIVER_APK_PATH: path.join(directorio, 'no-existe.apk') }), null);
  const vacio = path.join(directorio, 'vacio.apk');
  fs.writeFileSync(vacio, '');
  assert.equal(buscarApk({ DRIVER_APK_PATH: vacio }), null);
});

test('descripcionApk informa el peso en MB para el aviso de la landing', () => {
  assert.deepEqual(descripcionApk('1.4.2', { DRIVER_APK_PATH: apkReal }), {
    disponible: true,
    version: '1.4.2',
    tamanoMb: 1.5,
  });
});

test('descripcionApk indica indisponibilidad sin filtrar rutas internas', () => {
  const descripcion = descripcionApk(null, { DRIVER_APK_PATH: path.join(directorio, 'no-existe.apk') });
  assert.deepEqual(descripcion, { disponible: false, version: null, tamanoMb: null });
  assert.ok(!JSON.stringify(descripcion).includes(directorio));
});

test('nombreArchivo sanea la versión para el attachment', () => {
  assert.equal(nombreArchivo('1.4.2'), 'CiudadanConductor-1.4.2.apk');
  assert.equal(nombreArchivo('1.4.2"; rm -rf /'), 'CiudadanConductor-1.4.2rm-rf.apk');
  assert.match(nombreArchivo(undefined), /^CiudadanConductor-latest\.apk$/);
});

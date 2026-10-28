'use strict';

/**
 * Pruebas negativas de la guardia de payloads ofuscados
 * (ciudadan_backend_26/scripts/ci/check-payload-ofuscado.js).
 *
 * Las muestras son INERTES: se generan en un temporal del sistema FUERA del
 * repo, nunca se commitean y no contienen codigo de ataque; solo reproducen los
 * patrones que la guardia debe bloquear:
 *   (a) un api.js en la raiz del arbol,
 *   (b) una linea de mas de 5 KB,
 *   (c) el marcador de version del packer,
 *   (d) el bucle de rotacion del packer.
 *
 * Ejecutar: node --test ciudadan_backend_26/tests/check-payload-ofuscado.test.js
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const GUARDIA = path.join(__dirname, '..', 'scripts', 'ci', 'check-payload-ofuscado.js');

// Los marcadores se arman por concatenacion para que este archivo de pruebas
// NO sea detectado por la propia guardia (que escanea los .js del repo).
const MARCADOR_VERSION = 'global' + "['!']";
const MARCADOR_BUCLE = 'while(!!' + '[]){try{';

const temporal = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ci-guardia-payload-'));

const ejecutarGuardia = (dir) =>
  spawnSync(process.execPath, [GUARDIA, dir], { encoding: 'utf8' });

const ejecutarGuardiaEnRepo = (root) =>
  spawnSync(process.execPath, [GUARDIA], {
    encoding: 'utf8',
    env: { ...process.env, GUARDIA_ROOT: root },
  });

const escribir = (dir, nombre, contenido) => {
  fs.writeFileSync(path.join(dir, nombre), contenido, 'utf8');
};

test('detecta un api.js en la raiz del arbol', (t) => {
  const dir = temporal();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  escribir(dir, 'api.js', '// MUESTRA INERTE: no es codigo malicioso.\nmodule.exports = {};\n');

  const res = ejecutarGuardia(dir);
  assert.equal(res.status, 1, `la guardia debe fallar; stderr: ${res.stderr}`);
  assert.match(res.stderr, /api\.js/);
  assert.match(res.stderr, /archivo prohibido/);
});

test('detecta una linea de mas de 5 KB', (t) => {
  const dir = temporal();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const larga = 'A'.repeat(6000);
  escribir(dir, 'linea-larga.js', `// MUESTRA INERTE\nconst relleno = "${larga}";\nmodule.exports = relleno;\n`);

  const res = ejecutarGuardia(dir);
  assert.equal(res.status, 1, `la guardia debe fallar; stderr: ${res.stderr}`);
  assert.match(res.stderr, /linea-larga\.js/);
  assert.match(res.stderr, /linea \d+ de 6\d{3} caracteres/);
});

test('detecta el marcador de version del packer', (t) => {
  const dir = temporal();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  escribir(dir, 'marcador-version.js', `// MUESTRA INERTE\n${MARCADOR_VERSION} = '8-prueba';\n`);

  const res = ejecutarGuardia(dir);
  assert.equal(res.status, 1, `la guardia debe fallar; stderr: ${res.stderr}`);
  assert.match(res.stderr, /marcador-version\.js/);
  assert.match(res.stderr, /marcador de packer/);
});

test('detecta el bucle de rotacion del packer', (t) => {
  const dir = temporal();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  escribir(dir, 'bucle-packer.js', `// MUESTRA INERTE\n${MARCADOR_BUCLE}catch (e) {}\n`);

  const res = ejecutarGuardia(dir);
  assert.equal(res.status, 1, `la guardia debe fallar; stderr: ${res.stderr}`);
  assert.match(res.stderr, /bucle-packer\.js/);
  assert.match(res.stderr, /bucle de rotacion/);
});

test('un arbol limpio pasa la guardia (control positivo)', (t) => {
  const dir = temporal();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  escribir(dir, 'limpio.js', '// Archivo normal de ejemplo.\nmodule.exports = { ok: true };\n');

  const res = ejecutarGuardia(dir);
  assert.equal(res.status, 0, `la guardia debe pasar; stderr: ${res.stderr}`);
  assert.match(res.stdout, /Guardia OK/);
});

test('la guardia actual del repo pasa (arbol limpio)', () => {
  const res = spawnSync(process.execPath, [GUARDIA], { encoding: 'utf8' });
  assert.equal(res.status, 0, `la guardia debe pasar sobre el repo; stderr: ${res.stderr}`);
  assert.match(res.stdout, /Guardia OK/);
});

test('un directorio inexistente es error de uso (exit 2)', () => {
  const res = spawnSync(process.execPath, [GUARDIA, '/tmp/no-existe-ci-guardia-xyz'], { encoding: 'utf8' });
  assert.equal(res.status, 2);
  assert.match(res.stderr, /no existe o no es un directorio/);
});

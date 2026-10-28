'use strict';
/* Regresion del bug de publicacion del seed de Plaza Tecnologia (2026-10-28).
 *
 * El seed solo asignaba `publishedAt` en el path CREATE: la tienda y los
 * productos que ya existian de corridas anteriores quedaban con
 * published_at NULL aunque se ejecutara con `--apply --publish`.
 *
 * Estos tests fijan dos reglas:
 *   1. publicar SOLO lo que aun no esta publicado (nunca despublicar);
 *   2. el seed debe publicar tambien en los paths de actualizacion.
 *
 * Ejecutar: node --test tests/seed-plaza-publicar.test.js
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { publicarSiHaceFalta } = require('../seed/plaza-tecnologia/publicar');

const SEED_PATH = path.join(__dirname, '..', 'seed', 'plaza-tecnologia', 'seed-plaza-tecnologia.js');
const FIJO = () => '2026-10-28T00:00:00.000Z';

test('publica un registro que aun no esta publicado', () => {
  const patch = { nombre: 'Laptop X' };
  publicarSiHaceFalta(patch, { publishedAt: null }, FIJO);
  assert.strictEqual(patch.publishedAt, FIJO());
});

test('no despublica: deja intacto lo que ya tiene publishedAt', () => {
  const patch = { nombre: 'Laptop X' };
  publicarSiHaceFalta(patch, { publishedAt: '2026-10-27T10:00:00.000Z' }, FIJO);
  assert.strictEqual(patch.publishedAt, undefined);
});

test('registro nuevo (actual null) se publica', () => {
  const patch = {};
  publicarSiHaceFalta(patch, null, FIJO);
  assert.strictEqual(patch.publishedAt, FIJO());
});

test('el helper devuelve el mismo objeto (uso encadenado en update)', () => {
  const patch = { nombre: 'Monitor Y' };
  const resultado = publicarSiHaceFalta(patch, { publishedAt: null }, FIJO);
  assert.strictEqual(resultado, patch);
});

test('REGRESION: el seed publica tambien en el path de actualizacion de productos', () => {
  const src = fs.readFileSync(SEED_PATH, 'utf8');
  assert.ok(
    /if \(MODO_PUBLICAR\) publicarSiHaceFalta\(patch, existente\);/.test(src),
    'el path de actualizacion de productos debe publicar lo que falte',
  );
});

test('REGRESION: el seed publica tambien en el path de actualizacion de la tienda', () => {
  const src = fs.readFileSync(SEED_PATH, 'utf8');
  assert.ok(
    /if \(MODO_PUBLICAR\) publicarSiHaceFalta\(patchTienda, tienda\);/.test(src),
    'el path de actualizacion de la tienda debe publicar lo que falte',
  );
});

test('REGRESION: el seed usa el helper en los 4 puntos (create/update de tienda y productos)', () => {
  const src = fs.readFileSync(SEED_PATH, 'utf8');
  const usos = src.match(/publicarSiHaceFalta\(/g) || [];
  assert.ok(usos.length >= 4, 'se esperaban al menos 4 usos del helper, hay ' + usos.length);
});

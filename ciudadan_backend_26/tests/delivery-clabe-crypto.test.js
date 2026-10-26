'use strict';

/**
 * Cifrado AES-256-GCM de la CLABE: round-trip, fail-closed sin APP_KEYS,
 * deteccion de manipulacion del sobre.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const crypto = require('crypto');

// Import diferido: los tests fijan APP_KEYS ANTES de la primera derivacion.
function requireFresh(modulo) {
  delete require.cache[require.resolve(modulo)];
  return require(modulo);
}

test('sin APP_KEYS: cifrado no disponible y se niega a cifrar (fail closed)', () => {
  const previo = process.env.APP_KEYS;
  delete process.env.APP_KEYS;
  try {
    const { cifrarSecreto, descifrarSecreto, cifradoDisponible } = requireFresh(
      '../src/api/delivery-registration/utils/clabe-crypto'
    );
    assert.equal(cifradoDisponible(), false);
    assert.equal(cifrarSecreto('002180000123456789'), null, 'nunca guarda en claro');
    assert.equal(descifrarSecreto('v1:aa:bb:cc'), null);
  } finally {
    if (previo !== undefined) process.env.APP_KEYS = previo;
  }
});

test('con APP_KEYS: round-trip integro y formato v1 con GCM', () => {
  process.env.APP_KEYS = 'clave-de-pruebas-no-real,segunda-clave';
  try {
    const { cifrarSecreto, descifrarSecreto, cifradoDisponible } = requireFresh(
      '../src/api/delivery-registration/utils/clabe-crypto'
    );
    assert.equal(cifradoDisponible(), true);

    const secreto = '002180000123456789';
    const sobre = cifrarSecreto(secreto);

    assert.ok(sobre.startsWith('v1:'), 'formato versionado');
    assert.equal(sobre.split(':').length, 4, 'iv:tag:ct');
    assert.ok(!sobre.includes(secreto), 'el texto en claro no aparece en el sobre');
    assert.equal(descifrarSecreto(sobre), secreto);

    // Cifrado aleatorio: dos sobres del mismo secreto difieren.
    assert.notEqual(cifrarSecreto(secreto), sobre);
  } finally {
    delete process.env.APP_KEYS;
  }
});

test('sobre manipulado o con tag invalido devuelve null (sin texto en claro)', () => {
  process.env.APP_KEYS = 'clave-de-pruebas-no-real';
  try {
    const { cifrarSecreto, descifrarSecreto } = requireFresh(
      '../src/api/delivery-registration/utils/clabe-crypto'
    );
    const sobre = cifrarSecreto('002180000123456789');
    const partes = sobre.split(':');

    // Cambia un byte del ciphertext.
    const ct = Buffer.from(partes[3], 'base64');
    ct[0] = ct[0] ^ 0xff;
    const manipulado = [partes[0], partes[1], partes[2], Buffer.from(ct).toString('base64')].join(':');
    assert.equal(descifrarSecreto(manipulado), null);

    assert.equal(descifrarSecreto('v2:' + partes.slice(1).join(':')), null, 'version desconocida');
    assert.equal(descifrarSecreto('no-es-un-sobre'), null);
    assert.equal(descifrarSecreto(null), null);
  } finally {
    delete process.env.APP_KEYS;
  }
});

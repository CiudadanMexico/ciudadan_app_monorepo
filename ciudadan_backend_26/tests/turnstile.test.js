'use strict';

/**
 * Turnerstile: la seguridad NO se apaga por falta de configuración en
 * producción, y sí se puede omitir explícitamente en desarrollo.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { verificarTurnstile, politicaSinConfig } = require('../src/api/driver-launch-lead/utils/turnstile');

const sinLog = { warn: () => {}, error: () => {}, info: () => {} };

/** Ejecuta `fn` con un entorno limpio y lo restaura después. */
async function conEnv(variables, fn) {
  const claves = Object.keys(variables);
  const previos = Object.fromEntries(claves.map(k => [k, process.env[k]]));
  const prevNodeEnv = process.env.NODE_ENV;
  try {
    for (const clave of claves) {
      if (variables[clave] === undefined) delete process.env[clave];
      else process.env[clave] = variables[clave];
    }
    return await fn();
  } finally {
    for (const clave of claves) {
      if (previos[clave] === undefined) delete process.env[clave];
      else process.env[clave] = previos[clave];
    }
    process.env.NODE_ENV = prevNodeEnv;
  }
}

test('TURNSTILE_DISABLED=true omite la verificación (dev explícito)', async () => {
  await conEnv({ TURNSTILE_DISABLED: 'true', TURNSTILE_SECRET_KEY: undefined, NODE_ENV: 'production' }, async () => {
    const resultado = await verificarTurnstile(undefined, { strapi: { log: sinLog } });
    assert.deepEqual(resultado, { ok: true, omitido: true });
  });
});

test('sin TURNSTILE_SECRET_KEY en producción se RECHAZA con 503', async () => {
  await conEnv({ TURNSTILE_DISABLED: undefined, TURNSTILE_SECRET_KEY: undefined, NODE_ENV: 'production' }, async () => {
    const resultado = await verificarTurnstile('cualquier-token', { strapi: { log: sinLog } });
    assert.equal(resultado.ok, false);
    assert.equal(resultado.codigo, 503);
    assert.match(resultado.detalle, /TURNSTILE_SECRET_KEY/);
  });
});

test('sin TURNSTILE_SECRET_KEY fuera de producción se omite (no rompe el dev)', async () => {
  await conEnv({ TURNSTILE_DISABLED: undefined, TURNSTILE_SECRET_KEY: undefined, NODE_ENV: 'development' }, async () => {
    assert.deepEqual(politicaSinConfig(), { ok: true, omitido: true });
    const resultado = await verificarTurnstile(undefined, { strapi: { log: sinLog } });
    assert.equal(resultado.ok, true);
    assert.equal(resultado.omitido, true);
  });
});

test('con secreto configurado exige token: ausencia → 400', async () => {
  await conEnv({ TURNSTILE_DISABLED: undefined, TURNSTILE_SECRET_KEY: 'x'.repeat(20), NODE_ENV: 'production' }, async () => {
    const resultado = await verificarTurnstile('', { strapi: { log: sinLog } });
    assert.equal(resultado.ok, false);
    assert.equal(resultado.codigo, 400);
    assert.match(resultado.detalle, /Falta el token/);
  });
});

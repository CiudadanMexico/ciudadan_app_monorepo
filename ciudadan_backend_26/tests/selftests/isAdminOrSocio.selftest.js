'use strict';

/**
 * Selftest de la policy `is-admin-or-socio` (sin red ni servidor).
 *
 * Stub `utils/auth0-verify` vía require.cache para no llamar a Auth0, y
 * mock de `strapi` con los 4 motivos de rechazo. Antes del cambio la policy
 * devolvía `false` en todos los casos (403 genérico "Forbidden"); ahora debe
 * lanzar ForbiddenError con el motivo específico.
 *
 * Ejecutar: node tests/selftests/isAdminOrSocio.selftest.js
 */

const assert = require('assert');

// ---- Stub de getAuth0Email (se inyecta ANTES de requerir la policy) --------
const auth0Path = require.resolve('../../src/utils/auth0-verify.js');
require.cache[auth0Path] = {
  id: auth0Path,
  filename: auth0Path,
  loaded: true,
  exports: {
    getAuth0Email: async (token) => {
      if (token === 'token-valido') return 'socio@ciudadan.org';
      if (token === 'token-sin-usuario') return 'noexiste@ciudadan.org';
      if (token === 'token-sin-rol') return 'sinrol@ciudadan.org';
      throw Object.assign(new Error('invalid token'), { response: { data: 'denied' } });
    },
  },
};

const policy = require('../../src/policies/is-admin-or-socio.js');

// ---- Mocks ----------------------------------------------------------------
const USUARIOS = {
  'socio@ciudadan.org': { id: 7, email: 'socio@ciudadan.org', roles: { extra: ['admin', 'socio'] } },
  'sinrol@ciudadan.org': { id: 8, email: 'sinrol@ciudadan.org', roles: { extra: ['invitado'] } },
};

const strapiMock = {
  log: { warn() {}, info() {}, error() {} },
  db: {
    query: () => ({
      findOne: async ({ where }) => USUARIOS[where.email] || null,
    }),
  },
};

const ctxCon = (authorization) => ({
  request: { headers: authorization ? { authorization } : {} },
  state: {},
});

const correr = async (authorization) => {
  const ctx = ctxCon(authorization);
  const resultado = await policy(ctx, {}, { strapi: strapiMock });
  return { ctx, resultado };
};

(async () => {
  // 1. Sin cabecera Authorization → ForbiddenError con motivo.
  // Nota: ForbiddenError de @strapi/utils NO expone `.status` (solo
  // name/details/message); Strapi lo mapea a HTTP 403 por su nombre.
  await assert.rejects(
    () => correr(undefined),
    (err) => {
      assert.strictEqual(err.name, 'ForbiddenError');
      assert.strictEqual(err.status, 403, 'el error debe viajar con status 403');
      assert.strictEqual(err.expose, true, 'el mensaje debe exponerse al cliente');
      assert.ok(/Sin cabecera Authorization/.test(err.message), err.message);
      return true;
    },
    'sin header debe rechazar'
  );
  console.log('ok 1: sin cabecera → ForbiddenError "Sin cabecera Authorization"');

  // 2. Token que Auth0 rechaza → ForbiddenError con motivo de sesión.
  await assert.rejects(
    () => correr('Bearer token-malo'),
    (err) => {
      assert.strictEqual(err.name, 'ForbiddenError');
      assert.strictEqual(err.status, 403);
      assert.ok(/sesión no es válida o expiró/.test(err.message), err.message);
      return true;
    },
    'token inválido debe rechazar'
  );
  console.log('ok 2: token inválido → ForbiddenError de sesión');

  // 3. Email sin usuario en Strapi → ForbiddenError con motivo de cuenta.
  await assert.rejects(
    () => correr('Bearer token-sin-usuario'),
    (err) => {
      assert.strictEqual(err.name, 'ForbiddenError');
      assert.strictEqual(err.status, 403);
      assert.ok(/No existe una cuenta/.test(err.message), err.message);
      return true;
    },
    'usuario inexistente debe rechazar'
  );
  console.log('ok 3: usuario inexistente → ForbiddenError de cuenta');

  // 4. Usuario existente sin rol admin/socio → ForbiddenError con motivo de rol.
  await assert.rejects(
    () => correr('Bearer token-sin-rol'),
    (err) => {
      assert.strictEqual(err.name, 'ForbiddenError');
      assert.strictEqual(err.status, 403);
      assert.ok(/no tiene rol admin\/socio/.test(err.message), err.message);
      return true;
    },
    'usuario sin rol debe rechazar'
  );
  console.log('ok 4: usuario sin rol → ForbiddenError de rol');

  // 5. Caso feliz: admin/socio → pasa y setea ctx.state.strapiUser.
  const { ctx, resultado } = await correr('Bearer token-valido');
  assert.strictEqual(resultado, true, 'la policy debe permitir');
  assert.ok(ctx.state.strapiUser, 'debe setear strapiUser');
  assert.strictEqual(ctx.state.strapiUser.email, 'socio@ciudadan.org');
  console.log('ok 5: usuario admin/socio → permitido con ctx.state.strapiUser');

  console.log('\nisAdminOrSocio.selftest: 5/5 ok');
})().catch((err) => {
  console.error('isAdminOrSocio.selftest FALLÓ:', err.message);
  process.exit(1);
});

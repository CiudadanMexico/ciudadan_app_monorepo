'use strict';

/**
 * Fase E (QA, spec §11.E "Auth0") — pruebas de las policies de entrada del
 * modulo (is-delivery-reviewer / is-delivery-federal), que hoy no tenian
 * ninguna. Se ejercita el camino REAL de Auth0: Bearer -> /userinfo (axios
 * parcheado) -> usuario por email -> roles.extra -> ctx.state.strapiUser.
 *
 * Nota: getAuth0Email cachea la verificacion por token 30s; cada prueba usa
 * un token distinto para no pisarse.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const axios = require('axios');
const { crearStrapiRepartidoresMock, crearCtxRepartidores } = require('./helpers/strapi-mock-repartidores');
const { UIDS } = require('../src/api/delivery-registration/utils/constants');

const isDeliveryReviewer = require('../src/policies/is-delivery-reviewer');
const isDeliveryFederal = require('../src/policies/is-delivery-federal');

process.env.AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || 'ciudadan-tests.auth0.local';

const originalAxiosGet = axios.get;
const originalAuth0Domain = process.env.AUTH0_DOMAIN;

/** Simula la respuesta de /userinfo de Auth0 para un token dado. */
function auth0Responde({ email, status = 200 } = {}) {
  axios.get = async (url, config) => {
    if (status !== 200) {
      const err = new Error(`Request failed with status code ${status}`);
      err.response = { status, data: 'Unauthorized' };
      throw err;
    }
    return { data: { email } };
  };
}

function montar() {
  return crearStrapiRepartidoresMock({
    tablas: {
      [UIDS.USER]: [
        { id: 7, email: 'socio@ciudadan.org', roles: { extra: ['socio'] }, agencia: { id: 3, tipo: 'local' } },
        { id: 8, email: 'plain@ciudadan.org', roles: { extra: [] }, agencia: { id: 3, tipo: 'local' } },
        { id: 9, email: 'federal@ciudadan.org', roles: { extra: ['socio'] }, agencia: { id: 6, tipo: 'federal' } },
        { id: 10, email: 'root@ciudadan.org', roles: { extra: ['root'] }, agencia: { id: 3, tipo: 'local' } },
        { id: 11, email: 'federal-sin-rol@ciudadan.org', roles: { extra: [] }, agencia: { id: 6, tipo: 'federal' } },
      ],
      [UIDS.AGENCIA]: [
        { id: 3, nombre: 'Local Centro', tipo: 'local', publishedAt: '2026-01-01T00:00:00Z' },
        { id: 6, nombre: 'Federal', tipo: 'federal', publishedAt: '2026-01-01T00:00:00Z' },
      ],
      [UIDS.PROFILE]: [],
      [UIDS.VEHICLE]: [],
      [UIDS.EVENT]: [],
      [UIDS.TRAINING]: [],
      [UIDS.SIGNAL]: [],
      [UIDS.WAITLIST]: [],
    },
  });
}

function ctxConToken(token, { strapiUser = null } = {}) {
  return crearCtxRepartidores({
    headers: { authorization: `Bearer ${token}` },
    strapiUser,
  });
}

test.after(() => {
  axios.get = originalAxiosGet;
  process.env.AUTH0_DOMAIN = originalAuth0Domain;
});

// ---------------------------------------------------------------------------
// is-delivery-reviewer
// ---------------------------------------------------------------------------
test('is-delivery-reviewer: sin cabecera Authorization rechaza 403', async () => {
  montar();
  const ctx = crearCtxRepartidores({ headers: {} });
  await assert.rejects(
    () => isDeliveryReviewer(ctx, {}, { strapi: global.strapi }),
    (e) => e.status === 403 && /cabecera Authorization/.test(e.message)
  );
  assert.equal(ctx.state.strapiUser, null, 'no se fija usuario en ctx');
});

test('is-delivery-reviewer: token rechazado por Auth0 (401) rechaza 403 sin filtrar el error crudo', async () => {
  montar();
  auth0Responde({ status: 401 });
  const ctx = ctxConToken('token-invalido-1');
  await assert.rejects(
    () => isDeliveryReviewer(ctx, {}, { strapi: global.strapi }),
    (e) => e.status === 403 && /sesion no es valida/.test(e.message)
  );
});

test('is-delivery-reviewer: email sin cuenta en Strapi rechaza 403', async () => {
  montar();
  auth0Responde({ email: 'nadie@ciudadan.org' });
  const ctx = ctxConToken('token-valido-sin-cuenta');
  await assert.rejects(
    () => isDeliveryReviewer(ctx, {}, { strapi: global.strapi }),
    (e) => e.status === 403 && /No existe una cuenta/.test(e.message)
  );
});

test('is-delivery-reviewer: usuario autenticado sin rol socio/admin/root rechaza 403', async () => {
  montar();
  auth0Responde({ email: 'plain@ciudadan.org' });
  const ctx = ctxConToken('token-valido-sin-rol');
  await assert.rejects(
    () => isDeliveryReviewer(ctx, {}, { strapi: global.strapi }),
    (e) => e.status === 403 && /socio\/admin\/root/.test(e.message),
    'la policy exige rol de revision'
  );
});

test('is-delivery-reviewer: socio valido pasa y fija ctx.state.strapiUser (patron Auth0 del repo)', async () => {
  montar();
  auth0Responde({ email: 'socio@ciudadan.org' });
  const ctx = ctxConToken('token-valido-socio');
  const ok = await isDeliveryReviewer(ctx, {}, { strapi: global.strapi });
  assert.equal(ok, true);
  assert.equal(ctx.state.strapiUser.id, 7);
  assert.deepEqual(ctx.state.strapiUser.roles.extra, ['socio']);
  assert.equal(ctx.state.strapiUser.agencia.tipo, 'local', 'agencia populada para verificarAmbito');
});

test('is-delivery-reviewer: el token nunca se trata como usuario (sin email en /userinfo falla)', async () => {
  montar();
  axios.get = async () => ({ data: { sub: 'auth0|123' } }); // /userinfo sin email
  const ctx = ctxConToken('token-sin-email');
  await assert.rejects(
    () => isDeliveryReviewer(ctx, {}, { strapi: global.strapi }),
    (e) => e.status === 403,
    'sin email no hay usuario Strapi: fail closed'
  );
});

// ---------------------------------------------------------------------------
// is-delivery-federal
// ---------------------------------------------------------------------------
test('is-delivery-federal: socio de agencia LOCAL rechazado (403)', async () => {
  montar();
  auth0Responde({ email: 'socio@ciudadan.org' });
  const ctx = ctxConToken('token-socio-local');
  await assert.rejects(
    () => isDeliveryFederal(ctx, {}, { strapi: global.strapi }),
    (e) => e.status === 403 && /solo para miembros de una agencia federal/.test(e.message)
  );
});

test('is-delivery-federal: usuario de agencia FEDERAL pasa y queda en ctx.state', async () => {
  montar();
  auth0Responde({ email: 'federal@ciudadan.org' });
  const ctx = ctxConToken('token-federal-ok');
  const ok = await isDeliveryFederal(ctx, {}, { strapi: global.strapi });
  assert.equal(ok, true);
  assert.equal(ctx.state.strapiUser.id, 9);
  assert.equal(ctx.state.strapiUser.agencia.tipo, 'federal');
});

test('is-delivery-federal: root con agencia local pasa (bypass global vigente del repo)', async () => {
  montar();
  auth0Responde({ email: 'root@ciudadan.org' });
  const ctx = ctxConToken('token-root-ok');
  const ok = await isDeliveryFederal(ctx, {}, { strapi: global.strapi });
  assert.equal(ok, true);
  assert.equal(ctx.state.strapiUser.roles.extra[0], 'root');
});

test('is-delivery-federal: agencia federal SIN rol de revision rechazado (403)', async () => {
  montar();
  auth0Responde({ email: 'federal-sin-rol@ciudadan.org' });
  const ctx = ctxConToken('token-federal-sin-rol');
  await assert.rejects(
    () => isDeliveryFederal(ctx, {}, { strapi: global.strapi }),
    (e) => e.status === 403 && /socio\/admin\/root/.test(e.message),
    'ser federal no sustituye el rol de revision'
  );
});

'use strict';

/**
 * Contrato del módulo de favoritos (src/api/favorito):
 * - Las 4 rutas nuevas van con `auth: false` + policy Auth0 (sin esto Strapi
 *   responde 401 "Missing or invalid credentials" al usuario logueado).
 * - `toggleForUser` es idempotente: crear -> true, repetir -> false (elimina).
 * - `listForUser` solo devuelve los del usuario (relación o email legacy).
 * - `removeForUser` devuelve null si el favorito no es suyo (-> 404).
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const rutasAuth0 = require('../src/api/favorito/routes/01-favorito-auth0');

const AUTH0 = 'global::is-authenticated-auth0';

test('rutas de favoritos: auth:false + policy Auth0 en las 4', () => {
  const paths = rutasAuth0.routes.map((r) => `${r.method} ${r.path}`);
  assert.ok(paths.includes('GET /favoritos/mine'), 'falta GET /mine');
  assert.ok(paths.includes('GET /favoritos/check'), 'falta GET /check');
  assert.ok(paths.includes('POST /favoritos/toggle'), 'falta POST /toggle');
  assert.ok(paths.includes('DELETE /favoritos/:id'), 'falta DELETE /:id');

  for (const ruta of rutasAuth0.routes) {
    assert.equal(ruta.config.auth, false, `${ruta.path}: auth debe ser false`);
    assert.deepEqual(ruta.config.policies, [AUTH0], `${ruta.path}: debe exigir Auth0`);
  }
});

// --- service con strapi mockeado -------------------------------------------

const USER = { id: 7, email: 'socio@ciudadan.org' };
const OTRO = { id: 9, email: 'otro@ciudadan.org' };

function mockStrapi(favoritos) {
  const query = () => ({
    findMany: async ({ where = {} } = {}) => {
      const tipo = where.tipo;
      return favoritos.filter((f) => {
        if (tipo && f.tipo !== tipo) return false;
        const or = where.$or || [];
        return or.some((cond) => {
          if (cond.usuario?.id !== undefined) return f.usuario === cond.usuario.id;
          if (cond.usuario_email?.$eq !== undefined) return f.usuario_email === cond.usuario_email.$eq;
          return false;
        });
      });
    },
    findOne: async ({ where = {} } = {}) => {
      return (
        favoritos.find((f) => {
          if (where.id !== undefined && f.id !== where.id) return false;
          if (where.tipo && f.tipo !== where.tipo) return false;
          const tipoKey = ['producto', 'curso', 'contenido', 'club'].find((k) => where[k]);
          if (tipoKey && f[tipoKey] !== where[tipoKey].id) return false;
          const or = where.$or || [];
          if (or.length && !or.some((cond) => {
            if (cond.usuario?.id !== undefined) return f.usuario === cond.usuario.id;
            if (cond.usuario_email?.$eq !== undefined) return f.usuario_email === cond.usuario_email.$eq;
            return false;
          })) return false;
          return true;
        }) || null
      );
    },
    delete: async ({ where }) => {
      const idx = favoritos.findIndex((f) => f.id === where.id);
      if (idx === -1) throw new Error('no existe');
      const [borrado] = favoritos.splice(idx, 1);
      return borrado;
    },
  });

  let seq = 100;
  return {
    db: { query },
    entityService: {
      create: async (uid, { data }) => {
        const fila = { id: (seq += 1), ...data };
        favoritos.push(fila);
        return fila;
      },
    },
    log: { warn: () => {}, info: () => {}, error: () => {} },
    _favoritos: favoritos,
  };
}

function loadService(strapi) {
  // El service es createCoreService(uid, ({strapi}) => {...}): lo resolvemos
  // con un factory falso que invoca el callback con nuestro strapi mock.
  const Module = require('module');
  const path = require('path');
  const file = path.resolve(__dirname, '../src/api/favorito/services/favorito.js');
  const src = require('fs').readFileSync(file, 'utf8');
  const m = new Module(file, null);
  m.filename = file;
  m.paths = Module._nodeModulePaths(path.dirname(file));
  const fakeStrapiModule = {
    factories: {
      createCoreService: (uid, fn) => (typeof fn === 'function' ? fn({ strapi }) : {}),
    },
  };
  const fakeRequire = (id) => (id === '@strapi/strapi' ? fakeStrapiModule : require(id));
  const run = new Function('require', 'module', 'exports', src);
  run(fakeRequire, m, m.exports);
  return m.exports;
}


test('toggle: crea si no existe, elimina si ya existe (idempotente)', async () => {
  const strapi = mockStrapi([]);
  const service = loadService(strapi);

  const primero = await service.toggleForUser(USER, { tipo: 'producto', elementoId: 55, url: '/market/producto/x' });
  assert.equal(primero.favorito, true, 'primera vez debe crear');
  assert.ok(primero.favoritoId, 'debe devolver id');
  assert.equal(strapi._favoritos.length, 1, 'debe haber 1 fila');
  assert.equal(strapi._favoritos[0].usuario, USER.id, 'queda ligado al usuario');
  assert.equal(strapi._favoritos[0].producto, 55, 'solo la relación del tipo va llena');
  assert.equal(strapi._favoritos[0].curso, null, 'las demás quedan null');
  assert.ok(strapi._favoritos[0].publishedAt, 'con publishedAt (draftAndPublish)');

  const segundo = await service.toggleForUser(USER, { tipo: 'producto', elementoId: 55 });
  assert.equal(segundo.favorito, false, 'segunda vez debe quitar');
  assert.equal(strapi._favoritos.length, 0, 'no debe quedar fila');
});

test('toggle: tipo inválido -> 400', async () => {
  const strapi = mockStrapi([]);
  const service = loadService(strapi);
  await assert.rejects(
    () => service.toggleForUser(USER, { tipo: 'nave', elementoId: 1 }),
    (err) => err.status === 400
  );
});

test('list: solo los del usuario (no los de otros)', async () => {
  const strapi = mockStrapi([
    { id: 1, tipo: 'producto', producto: 10, usuario: USER.id, usuario_email: USER.email },
    { id: 2, tipo: 'curso', curso: 20, usuario: OTRO.id, usuario_email: OTRO.email },
  ]);
  const service = loadService(strapi);

  const mios = await service.listForUser(USER, {});
  assert.equal(mios.length, 1, 'solo 1 es mío');
  assert.equal(mios[0].id, 1);

  const porTipo = await service.listForUser(USER, { tipo: 'curso' });
  assert.equal(porTipo.length, 0, 'mi curso no existe');
});

test('remove: null si no es suyo (el controller devuelve 404)', async () => {
  const strapi = mockStrapi([
    { id: 5, tipo: 'club', club: 30, usuario: OTRO.id, usuario_email: OTRO.email },
  ]);
  const service = loadService(strapi);

  const ajeno = await service.removeForUser(USER, 5);
  assert.equal(ajeno, null, 'no debe borrar lo ajeno');
  assert.equal(strapi._favoritos.length, 1, 'la fila sigue ahí');

  strapi._favoritos.push({ id: 6, tipo: 'club', club: 31, usuario: USER.id, usuario_email: USER.email });
  const propio = await service.removeForUser(USER, 6);
  assert.equal(propio.id, 6, 'sí borra lo propio');
});

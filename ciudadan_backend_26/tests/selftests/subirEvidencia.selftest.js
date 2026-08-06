'use strict';

/**
 * Smoke test del flujo de autorización por área del verificador en
 * subir-evidencia.js. Mockeamos strapi.entityService, fs, crypto y el
 * helper visibility para probar solo la nueva rama de validación.
 *
 * Ejecutar: node src/api/tarea/controllers/subirEvidencia.selftest.js
 */

const assert = require('assert');

// ---- Fixtures -----------------------------------------------------------
const tareas = {
  // Tarea con todo general
  1: {
    id: 1, status: 'completada', media: [], validaciones: [],
    usuario: { id: 50 }, reviewed_by: null,
    todo: { id: 200, nivel: 'general', areas: [], subareas: [] },
  },
  // Tarea con todo especializado en área 10 (verificador tiene 10)
  2: {
    id: 2, status: 'completada', media: [], validaciones: [],
    usuario: { id: 50 }, reviewed_by: null,
    todo: { id: 201, nivel: 'especialidad', areas: [{ id: 10 }], subareas: [] },
  },
  // Tarea con todo especializado en área 99 (verificador NO tiene 99)
  3: {
    id: 3, status: 'completada', media: [], validaciones: [],
    usuario: { id: 50 }, reviewed_by: null,
    todo: { id: 202, nivel: 'experto', areas: [{ id: 99 }], subareas: [] },
  },
  // Tarea especializada en subarea 15
  4: {
    id: 4, status: 'completada', media: [], validaciones: [],
    usuario: { id: 50 }, reviewed_by: null,
    todo: { id: 203, nivel: 'especialidad', areas: [], subareas: [{ id: 15 }] },
  },
};

// ---- Mock global strapi -------------------------------------------------
global.strapi = {
  entityService: {
    findOne: async (uid, id, opts) => {
      if (uid === 'api::tarea.tarea') {
        const t = tareas[id];
        if (!t) return null;
        // Devolver clonado plano respetando opts.populate (simplificación)
        return JSON.parse(JSON.stringify(t));
      }
      return null;
    },
    update: async () => ({ id: 1 }),
  },
  log: { warn: () => {}, error: () => {} },
};

// ---- Mock fs (no tocamos disco real) -----------------------------------
const fs = require('fs');
const realExists = fs.existsSync;
const realMkdir = fs.mkdirSync;
const realWrite = fs.writeFileSync;
fs.existsSync = () => true;
fs.mkdirSync = () => {};
fs.writeFileSync = () => {};

// ---- Usuarios -----------------------------------------------------------
const admin = { id: 1, email: 'a@x', roles: { extra: ['admin'] }, role: { name: 'Admin' } };
const socio = { id: 2, email: 's@x', roles: { extra: ['socio'] }, role: { name: 'Socio' } };
const verificadorConArea10 = {
  id: 3, email: 'v1@x', roles: { extra: ['verificador'] }, role: { name: 'Authenticated' },
  areas: [{ id: 10 }], area_details: { 10: { status: 'verified' } }, skills: [],
};
const verificadorSinNada = {
  id: 4, email: 'v2@x', roles: { extra: ['verificador'] }, role: { name: 'Authenticated' },
  areas: [], area_details: {}, skills: [],
};
const verificadorConSubarea15 = {
  id: 5, email: 'v3@x', roles: { extra: ['verificador'] }, role: { name: 'Authenticated' },
  areas: [{ id: 15 }], area_details: { 15: { status: 'verified' } }, skills: [],
};

const fullUsersMock = {
  3: verificadorConArea10,
  4: verificadorSinNada,
  5: verificadorConSubarea15,
};

// ---- Mock loadUserWithRelations (sólo devuelve campos correlaciones) ---
const visibilityMod = require('../../../utils/cowork/visibility');
const origLoad = visibilityMod.loadUserWithRelations;
visibilityMod.loadUserWithRelations = async (user) => fullUsersMock[user.id] || user;

// ---- Cargar controller --------------------------------------------------
const ctrl = require('./subir-evidencia.js');

function mkCtx(body, user) {
  const e4xx = (code) => (msg) => {
    const e = new Error(msg);
    e.statusCode = code;
    throw e;
  };
  return {
    request: { body },
    state: { strapiUser: user },
    badRequest: e4xx(400),
    notFound: e4xx(404),
    forbidden: e4xx(403),
    body: null,
  };
}

async function call(body, user) {
  const ctx = mkCtx(body, user);
  let threw = null;
  try {
    await ctrl.subirEvidencia(ctx);
  } catch (e) {
    threw = e;
  }
  return { ctx, threw };
}

function mkFile() {
  return {
    nombre: 'x.png',
    tipo: 'image/png',
    dataBase64: Buffer.from('fake').toString('base64'),
  };
}

// ---- Tests -------------------------------------------------------------

async function run() {
  // 1. Sin tareaId → 400
  let r = await call({ archivos: [mkFile()] }, verificadorConArea10);
  assert.strictEqual(r.threw.statusCode, 400);
  console.log('ok 1: sin tareaId → 400');

  // 2. Sin archivos → 400
  r = await call({ tareaId: 1 }, verificadorConArea10);
  assert.strictEqual(r.threw.statusCode, 400);
  console.log('ok 2: sin archivos → 400');

  // 3. Tarea inexistente → 404
  r = await call({ tareaId: 999, archivos: [mkFile()] }, verificadorConArea10);
  assert.strictEqual(r.threw.statusCode, 404);
  console.log('ok 3: tarea inexistente → 404');

  // 4. Admin sobre tarea especializada en área NO propia → bypass OK
  r = await call({ tareaId: 3, archivos: [mkFile()] }, admin);
  assert.strictEqual(r.threw, null);
  console.log('ok 4: admin bypass sobre cualquier tarea');

  // 5. Socio bypass también
  r = await call({ tareaId: 3, archivos: [mkFile()] }, socio);
  assert.strictEqual(r.threw, null);
  console.log('ok 5: socio bypass');

  // 6. Verificador con área 10, tarea general → OK
  r = await call({ tareaId: 1, archivos: [mkFile()] }, verificadorConArea10);
  assert.strictEqual(r.threw, null);
  console.log('ok 6: verificador puede subir a tarea general');

  // 7. Verificador con área 10, tarea especializada en área 10 → OK
  r = await call({ tareaId: 2, archivos: [mkFile()] }, verificadorConArea10);
  assert.strictEqual(r.threw, null);
  console.log('ok 7: verificador con área coincidente → OK');

  // 8. Verificador con área 10, tarea especializada en área 99 → 403
  r = await call({ tareaId: 3, archivos: [mkFile()] }, verificadorConArea10);
  assert.strictEqual(r.threw.statusCode, 403);
  assert.match(r.threw.message, /área verificada/);
  console.log('ok 8: verificador en área no coincidente → 403');

  // 9. Verificador sin áreas verifier, tarea general → OK (general no requiere)
  r = await call({ tareaId: 1, archivos: [mkFile()] }, verificadorSinNada);
  assert.strictEqual(r.threw, null);
  console.log('ok 9: verificador sin areas → OK en general');

  // 10. Verificador sin áreas, tarea especializada → 403
  r = await call({ tareaId: 2, archivos: [mkFile()] }, verificadorSinNada);
  assert.strictEqual(r.threw.statusCode, 403);
  console.log('ok 10: verificador sin areas, especializada → 403');

  // 11. Verificador con subárea 15, tarea especializada en subarea 15 → OK
  r = await call({ tareaId: 4, archivos: [mkFile()] }, verificadorConSubarea15);
  assert.strictEqual(r.threw, null);
  console.log('ok 11: verificador con subarea coincidente → OK');

  cleanup();
  console.log('\nTodos los smoke tests de subir-evidencia OK');
}

function cleanup() {
  visibilityMod.loadUserWithRelations = origLoad;
  fs.existsSync = realExists;
  fs.mkdirSync = realMkdir;
  fs.writeFileSync = realWrite;
}

if (require.main === module) {
  run().catch((err) => {
    cleanup();
    console.error('FAIL:', err);
    process.exit(1);
  });
} else {
  module.exports = { run };
}

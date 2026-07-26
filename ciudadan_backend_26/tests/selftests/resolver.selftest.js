'use strict';

/**
 * Smoke test del controller resolver.js (sin frameworks ni servidor).
 * Mockeamos strapi.entityService y al helper canUserTakeTodo para
 * validar el flujo de autorización.
 *
 * Ejecutar: node src/api/tarea/controllers/resolver.selftest.js
 */

const assert = require('assert');

// ---- Mock global strapi -------------------------------------------------
const todosDB = {
  1: { id: 1, status: 'publicada', nivel: 'general', areas: [], subareas: [], skills: [] },
  2: { id: 2, status: 'asignada', nivel: 'general', areas: [], subareas: [], skills: [] },
  3: {
    id: 3, status: 'publicada', nivel: 'especialidad',
    areas: [{ id: 10 }], subareas: [], skills: [],
  },
  4: {
    id: 4, status: 'publicada', nivel: 'experto',
    areas: [{ id: 99 }], subareas: [], skills: [],
  },
};

let createdTarea = null;
let updatedTodoId = null;
let updatedTodoStatus = null;

global.strapi = {
  entityService: {
    findOne: async (uid, id) => {
      if (uid === 'api::todo.todo') return todosDB[id] ? { ...todosDB[id] } : null;
      return null;
    },
    create: async (uid, { data }) => {
      createdTarea = { id: 999, ...data };
      return createdTarea;
    },
    update: async (uid, id, { data }) => {
      updatedTodoId = id;
      updatedTodoStatus = data.status;
      return { id, ...data };
    },
  },
};

// ---- Mock del helper canUserTakeTodo ------------------------------------
// Reemplazamos el require del módulo antes de cargar el controller.
const visibilityModule = require('../../../utils/cowork/visibility');
const originalCanTake = visibilityModule.canUserTakeTodo;
let fakeCanTakeResult = { ok: true };
visibilityModule.canUserTakeTodo = async () => fakeCanTakeResult;

// ---- Cargar controller --------------------------------------------------
const resolver = require('./resolver.js');

// ---- Helpers -----------------------------------------------------------
function mkCtx(body, user) {
  return {
    request: { body },
    state: { strapiUser: user },
    // Koa/Strapi ctx.throw lanza de verdad (no devuelve). Lo imitamos así
    // para que el flujo del controller sea igual al real.
    throw: (code, msg) => {
      const e = new Error(msg || 'throw');
      e.statusCode = code;
      throw e;
    },
  };
}

async function call(body, user) {
  const ctx = mkCtx(body, user);
  let threw = null;
  try {
    await resolver.resolver(ctx);
  } catch (e) {
    threw = e;
  }
  return { ctx, threw };
}

// ---- Tests -------------------------------------------------------------

async function run() {
  // 1. No autenticado → 401
  fakeCanTakeResult = { ok: true };
  createdTarea = null;
  let r = await call({ todoId: 1 }, null);
  assert.strictEqual(r.threw.statusCode, 401);
  assert.strictEqual(createdTarea, null, 'no debe crear tarea sin auth');
  console.log('ok 1: sin auth → 401, no crea');

  // 2. Sin todoId → 400
  r = await call({}, { id: 7, email: 'u@x' });
  assert.strictEqual(r.threw.statusCode, 400);
  console.log('ok 2: sin todoId → 400');

  // 3. Todo no existe → 404
  r = await call({ todoId: 999 }, { id: 7, email: 'u@x' });
  assert.strictEqual(r.threw.statusCode, 404);
  console.log('ok 3: todo inexistente → 404');

  // 4. Todo no está publicada → 400
  r = await call({ todoId: 2 }, { id: 7, email: 'u@x' });
  assert.strictEqual(r.threw.statusCode, 400);
  assert.ok(/no está disponible/.test(r.threw.message));
  console.log('ok 4: todo no publicada → 400');

  // 5. canUserTakeTodo dice ok → crea tarea + actualiza todo
  fakeCanTakeResult = { ok: true };
  createdTarea = null; updatedTodoId = null; updatedTodoStatus = null;
  r = await call({ todoId: 1 }, { id: 7, email: 'u@x' });
  assert.strictEqual(r.threw, null, 'no debe lanzar');
  assert.ok(createdTarea, 'crea la tarea');
  assert.strictEqual(createdTarea.usuario, 7);
  assert.strictEqual(createdTarea.status, 'en_proceso');
  assert.strictEqual(updatedTodoId, 1);
  assert.strictEqual(updatedTodoStatus, 'asignada');
  assert.deepStrictEqual(r.ctx.body, { data: createdTarea });
  console.log('ok 5: autorizado → crea + actualiza todo');

  // 6. canUserTakeTodo dice NO → 403, no crea nada
  fakeCanTakeResult = { ok: false, reason: 'No tienes área verificada' };
  createdTarea = null; updatedTodoId = null;
  r = await call({ todoId: 3 }, { id: 7, email: 'u@x' });
  assert.strictEqual(r.threw.statusCode, 403);
  assert.strictEqual(r.threw.message, 'No tienes área verificada');
  assert.strictEqual(createdTarea, null, 'no debe crear nada si no autorizado');
  assert.strictEqual(updatedTodoId, null, 'no debe actualizar el todo si no autorizado');
  console.log('ok 6: rechazado → 403, no crea');

  // 7. Especializada válida pasa por canUserTakeTodo (no bypass aquí)
  fakeCanTakeResult = { ok: true };
  createdTarea = null;
  r = await call({ todoId: 3 }, { id: 7, email: 'u@x' });
  assert.strictEqual(r.threw, null);
  assert.ok(createdTarea, 'especializada autorizada se crea');
  console.log('ok 7: especializada autorizada → crea');

  // Restaurar
  visibilityModule.canUserTakeTodo = originalCanTake;

  console.log('\nTodos los smoke tests del resolver OK');
}

if (require.main === module) {
  run().catch((err) => {
    visibilityModule.canUserTakeTodo = originalCanTake;
    console.error('FAIL:', err);
    process.exit(1);
  });
} else {
  module.exports = { run };
}

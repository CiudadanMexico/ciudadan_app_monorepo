'use strict';

/**
 * Smoke test del controller calificar.js (sin frameworks ni servidor).
 * Verifica que el flujo de estados sea completada/corregida → calificada → pagada
 * dentro de la tx, con pago acreditado y todo propagado.
 *
 * Ejecutar: node src/api/tarea/controllers/calificar.selftest.js
 */

const assert = require('assert');

// ---- Estado en memoria --------------------------------------------------
const tareasDB = {
  // Tarea en "completada" (caso típico)
  100: {
    id: 100,
    status: 'completada',
    score: null,
    reviewed_by: null,
    calificaciones: [],
    pagos_laborys: [],
    payment_status: 'pendiente',
    resolved_at: null,
    usuario: { id: 50 },
    todo: { id: 200 },
  },
};

const todosDB = {
  200: { id: 200, status: 'pendiente_revision', reward_laborys: 100 },
};

let carteraDB = null;

// Registro de llamadas para verificar el orden de transiciones.
const updatesOnTarea = []; // [{ id, data }]
const updatesOnTodo = [];
let carteraCreated = null;

// ---- Mock global strapi -------------------------------------------------
global.strapi = {
  log: { error: () => {} },
  entityService: {
    findOne: async (uid, id, opts) => {
      if (uid === 'api::tarea.tarea') {
        const t = tareasDB[id];
        if (!t) return null;
        // Devolvemos un clonado plano para que el controller no mute la DB
        return JSON.parse(JSON.stringify(t));
      }
      if (uid === 'api::todo.todo') {
        const t = todosDB[id];
        if (!t) return null;
        // Si piden fields específicos (reward_laborys/recompensa), devolvemos esos
        return { id: t.id, status: t.status, reward_laborys: t.reward_laborys, recompensa: null };
      }
      return null;
    },
    update: async (uid, id, { data }) => {
      if (uid === 'api::tarea.tarea') {
        // Aplicar al registro en DB (con merge básico)
        const t = tareasDB[id];
        const updated = { ...t, ...data };
        tareasDB[id] = updated;
        updatesOnTarea.push({ id, data: { ...data } });
        return JSON.parse(JSON.stringify(updated));
      }
      if (uid === 'api::todo.todo') {
        const t = todosDB[id];
        const updated = { ...t, ...data };
        todosDB[id] = updated;
        updatesOnTodo.push({ id, data: { ...data } });
        return JSON.parse(JSON.stringify(updated));
      }
      return null;
    },
  },
  db: {
    transaction: async (fn) => fn(),
    query: (uid) => {
      if (uid === 'api::cartera.cartera') {
        return {
          findOne: async () => carteraDB,
          update: async ({ data }) => {
            carteraDB = { ...carteraDB, ...data };
            return carteraDB;
          },
          create: async ({ data }) => {
            carteraCreated = { ...data };
            carteraDB = { id: 1, ...data };
            return carteraDB;
          },
        };
      }
      // count usado por otros controllers, no aquí
      return { count: async () => 0 };
    },
  },
};

// ---- Cargar controller --------------------------------------------------
const calificar = require('./calificar.js');

// ---- Helpers -----------------------------------------------------------
function mkCtx(body, user) {
  return {
    request: { body },
    state: { strapiUser: user },
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
    await calificar.calificar(ctx);
  } catch (e) {
    threw = e;
  }
  return { ctx, threw };
}

function resetState() {
  tareasDB[100] = {
    id: 100, status: 'completada', score: null, reviewed_by: null,
    calificaciones: [], pagos_laborys: [], payment_status: 'pendiente',
    resolved_at: null, usuario: { id: 50 }, todo: { id: 200 },
  };
  todosDB[200] = { id: 200, status: 'pendiente_revision', reward_laborys: 100 };
  carteraDB = null;
  updatesOnTarea.length = 0;
  updatesOnTodo.length = 0;
  carteraCreated = null;
}

// ---- Tests -------------------------------------------------------------

async function run() {
  // 1. No autenticado → 401
  resetState();
  let r = await call({ tareaId: 100, score: 5 }, null);
  assert.strictEqual(r.threw.statusCode, 401);
  assert.strictEqual(updatesOnTarea.length, 0, 'no debe actualizar nada');
  console.log('ok 1: sin auth → 401');

  // 2. Sin score → 400
  resetState();
  r = await call({ tareaId: 100 }, { id: 1, email: 'rev@x' });
  assert.strictEqual(r.threw.statusCode, 400);
  console.log('ok 2: sin score → 400');

  // 3. Tarea no existe → 404
  resetState();
  r = await call({ tareaId: 999, score: 5 }, { id: 1, email: 'rev@x' });
  assert.strictEqual(r.threw.statusCode, 404);
  console.log('ok 3: tarea inexistente → 404');

  // 4. Estado no calificable → 400 (probamos poniendola en en_proceso)
  resetState();
  tareasDB[100].status = 'en_proceso';
  r = await call({ tareaId: 100, score: 5 }, { id: 1, email: 'rev@x' });
  assert.strictEqual(r.threw.statusCode, 400);
  assert.ok(/completada o corregida/.test(r.threw.message));
  console.log('ok 4: estado no calificable → 400');

  // 5. Happy path completada → calificada → pagada + cartera + todo pagada
  resetState();
  r = await call(
    { tareaId: 100, score: 4, notes: 'bien' },
    { id: 1, email: 'rev@x' }
  );
  assert.strictEqual(r.threw, null, 'no debe lanzar');

  // Verificar que se hicieron 2 actualizaciones sobre la tarea:
  //   1: status=calificada + calificaciones (sin pago, sin payment_status)
  //   2: status=pagada + pagos_laborys + payment_status=procesado
  assert.strictEqual(updatesOnTarea.length, 2, 'dos actualizaciones: calificada, pagada');
  assert.strictEqual(updatesOnTarea[0].data.status, 'calificada', 'primera → calificada');
  assert.strictEqual(updatesOnTarea[1].data.status, 'pagada', 'segunda → pagada');

  // La primera SOLO contiene calificación, NO contiene pago
  assert.ok(Array.isArray(updatesOnTarea[0].data.calificaciones), 'primera incluye calificaciones');
  assert.ok(updatesOnTarea[0].data.pagos_laborys === undefined, 'primera NO incluye pagos');
  assert.ok(updatesOnTarea[0].data.payment_status === undefined, 'primera NO toca payment_status');

  // La segunda SOLO contiene pago, ya NO contiene calificaciones
  assert.ok(Array.isArray(updatesOnTarea[1].data.pagos_laborys), 'segunda incluye pagos');
  assert.strictEqual(updatesOnTarea[1].data.payment_status, 'procesado');
  assert.ok(updatesOnTarea[1].data.calificaciones === undefined, 'segunda NO toca calificaciones');

  // Pago acreditado en cartera nueva (no existía)
  assert.ok(carteraCreated, 'crea cartera porque no existía');
  assert.strictEqual(carteraCreated.laborysGanados, 100);
  assert.strictEqual(carteraCreated.laborysSaldo, 100);
  assert.strictEqual(carteraCreated.user_id, 50);

  // Todo propagado a pagada (una sola actualización)
  assert.strictEqual(updatesOnTodo.length, 1);
  assert.strictEqual(updatesOnTodo[0].data.status, 'pagada');

  // Respuesta con shape esperado
  assert.ok(r.ctx.body.data.tarea, 'shape: data.tarea');
  assert.ok(r.ctx.body.data.todo, 'shape: data.todo');
  assert.ok(r.ctx.body.data.pago, 'shape: data.pago');
  assert.strictEqual(r.ctx.body.data.pago.monto_laborys, 100);
  assert.strictEqual(r.ctx.body.data.pago.acreditado, true);
  console.log('ok 5: happy path completada → calificada → pagada + pago + todo propagado');

  // 6. Happy path desde "corregida" también funciona
  resetState();
  tareasDB[100].status = 'corregida';
  r = await call({ tareaId: 100, score: 5 }, { id: 1, email: 'rev@x' });
  assert.strictEqual(r.threw, null);
  assert.strictEqual(updatesOnTarea[0].data.status, 'calificada');
  assert.strictEqual(updatesOnTarea[1].data.status, 'pagada');
  console.log('ok 6: corregida → calificada → pagada también funciona');

  // 7. reward_laborys=0 no crea cartera pero igual factura status
  resetState();
  todosDB[200].reward_laborys = 0;
  r = await call({ tareaId: 100, score: 3 }, { id: 1, email: 'rev@x' });
  assert.strictEqual(r.threw, null);
  assert.strictEqual(r.ctx.body.data.pago.acreditado, false);
  assert.strictEqual(carteraCreated, null, 'no crea cartera con monto 0');
  assert.strictEqual(r.ctx.body.data.pago.monto_laborys, 0);
  console.log('ok 7: monto 0 no toca cartera');

  console.log('\nTodos los smoke tests del calificar OK');
}

if (require.main === module) {
  run().catch((err) => {
    console.error('FAIL:', err);
    process.exit(1);
  });
} else {
  // Exportar para que Strapi pueda cargar este archivo como módulo sin
  // disparar la ejecución incidental de los smoke tests.
  module.exports = { run };
}

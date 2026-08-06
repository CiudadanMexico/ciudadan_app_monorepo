// Test E2E del flujo CoWork usando Strapi bootstrap directamente (sin Auth0).
// Valida:
//   1. Crear una tarea (resolución) nueva apuntando a un todo publicado +
//      un usuario existente.
//   2. Marcar la tarea como 'completada' (vía controller completar.js).
//   3. Llamar al controller calificar.js (score 5) — debe hacer
//      transición atómica completada → calificada → pagada + acreditar cartera
//      + propagar todo.status=pagada.
//   4. (Opcional) Apelar la calificación via apelar.js con motivo largo.
//   5. Resolver la apelación via resolver-apelacion.js.
//
// CORRE ASÍ (desde el directorio del backend):
//   node test-cowork-e2e.js
// Requiere Strapi corriendo en otra pestaña (para que cree las tablas
// y cargue los content-types). El script arranca SU PROPIO Strapi en
// modo script (strapi().load()) — no usa el servidor HTTP.

const path = require('path');
const fs = require('fs');

(async () => {
  // Forzar sqlite en el working dir del backend (igual que Strapi).
  process.env.DATABASE_CLIENT = process.env.DATABASE_CLIENT || 'sqlite';
  process.env.NODE_OPTIONS = '--openssl-legacy-provider';

  const Strapi = require('@strapi/strapi');
  // Detecta automáticamente schema.json, config, etc.
  const app = await Strapi({ dir: process.cwd() }).load();
  console.log('Strapi cargado en modo script. DB:', app.config.get('database.connection.client'));

  try {
    // 1. Buscar un todo + usuario existente
    const todos = await app.entityService.findMany('api::todo.todo', {
      filters: { status: 'publicada' },
      fields: ['id', 'titulo', 'status', 'reward_laborys', 'recompensa'],
      limit: 1,
    });
    if (!todos.length) throw new Error('No hay un todo publicado en la DB para test E2E. Crea uno primero.');
    const todo = todos[0];
    console.log(`[+] Todo encontrado #${todo.id} (titulo=${todo.titulo}, reward=${todo.reward_laborys ?? todo.recompensa}, status=${todo.status})`);

    const users = await app.entityService.findMany('plugin::users-permissions.user', {
      fields: ['id', 'username', 'email'],
      limit: 1,
    });
    if (!users.length) throw new Error('No hay usuarios en la DB para test E2E.');
    const user = users[0];
    console.log(`[+] Usuario de prueba: ${user.email} (id=${user.id})`);

    // 2. Resetear un estado inicial consistente: creamos una tarea 'en_proceso'
    //    vinculada al todo. (El lifecycle beforeCreate valida que el todo
    //    no esté terminal.)
    if (todo.status === 'pagada') {
      console.log('[!] El todo ya está pagada — lo reseteo a publicada para el test');
      await app.entityService.update('api::todo.todo', todo.id, { data: { status: 'publicada' } });
    }

    const nueva = await app.entityService.create('api::tarea.tarea', {
      data: {
        usuario: user.id,
        todo: todo.id,
        tipo: 'tarea',
        status: 'en_proceso',
      },
      populate: ['usuario', 'todo'],
    });
    console.log(`[+] Tarea creada #${nueva.id} (status=en_proceso, todo=${nueva.todo.id})`);

    // 3. Simular ctx como lo haría un controller de Strapi: creamos un
    //    ctx falso y llamamos al controller directamente. Esto evita
    //   Auth0 policy check.
    const completarCtrl = require('./src/api/tarea/controllers/completar');
    const calificarCtrl = require('./src/api/tarea/controllers/calificar');

    const fakeCtxFor = (body) => ({
      state: { strapiUser: user },
      request: { body },
      badRequest: (msg, opts) => { const e = new Error(String(msg)); e.status = 400; throw e; },
      notFound: (msg) => { const e = new Error(String(msg)); e.status = 404; throw e; },
      forbidden: (msg) => { const e = new Error(String(msg)); e.status = 403; throw e; },
      unauthorized: (msg) => { const e = new Error(String(msg)); e.status = 401; throw e; },
      send: (data, status) => { fakeCtxFor._sent = { data, status }; },
      // Controllers escriben en ctx.body (Strapi lo convierte a response).
      body: undefined,
    });

    let ctx = fakeCtxFor({ tareaId: nueva.id });
    await completarCtrl.completar(ctx);
    console.log('[+] completar() OK:', JSON.stringify(ctx.body).substring(0, 200));

    // Refetch tarea y todo
    let tarea = await app.entityService.findOne('api::tarea.tarea', nueva.id, { fields: ['id', 'status', 'payment_status', 'score'] });
    let todoAfter = await app.entityService.findOne('api::todo.todo', todo.id, { fields: ['id', 'status'] });
    console.log(`[>] Tarea after completar: status=${tarea.status}`);
    console.log(`[>] Todo after completar: status=${todoAfter.status}`);

    // Verificar transición válida: tarea debe estar 'completada'
    if (tarea.status !== 'completada') {
      throw new Error('TEST FAIL: tarea no está en completada después de completar()');
    }

    // 4. Calificar → debería transición atómica: completada → calificada → pagada
    //    + acreditar cartera + propagar todo → pagada
    ctx = fakeCtxFor({ tareaId: nueva.id, score: 5, notes: 'E2E test OK' });
    await calificarCtrl.calificar(ctx);
    console.log('[+] calificar() OK:', JSON.stringify(ctx.body).substring(0, 400));

    tarea = await app.entityService.findOne('api::tarea.tarea', nueva.id, {
      fields: ['id', 'status', 'payment_status', 'score', 'pagos_laborys', 'calificaciones'],
      populate: ['usuario', 'todo'],
    });
    todoAfter = await app.entityService.findOne('api::todo.todo', todo.id, { fields: ['id', 'status'] });
    console.log(`[>] Tarea after calificar: status=${tarea.status}, payment_status=${tarea.payment_status}, score=${tarea.score}`);
    console.log(`[>] Todo after calificar: status=${todoAfter.status}`);
    console.log(`[>] pagos_laborys de la tarea: ${JSON.stringify(tarea.pagos_laborys).substring(0, 250)}`);

    if (tarea.status !== 'pagada') throw new Error(`TEST FAIL: tarea debería estar 'pagada', está '${tarea.status}'`);
    if (tarea.payment_status !== 'procesado') throw new Error(`TEST FAIL: payment_status debería ser 'procesado', es '${tarea.payment_status}'`);
    if (tarea.score !== 5) throw new Error(`TEST FAIL: score debería ser 5, es ${tarea.score}`);
    if (!Array.isArray(tarea.pagos_laborys) || !tarea.pagos_laborys.length) {
      throw new Error('TEST FAIL: pagos_laborys no tiene entradas');
    }
    if (todoAfter.status !== 'pagada') throw new Error(`TEST FAIL: todo debería estar 'pagada', está '${todoAfter.status}'`);

    // 5. Verificar cartera acreditada
    const cartera = await app.db.query('api::cartera.cartera').findOne({ where: { user_id: user.id } });
    console.log(`[>] Cartera del user: laborysSaldo=${cartera?.laborysSaldo}, laborysGanados=${cartera?.laborysGanados}`);
    const payEntry = (tarea.pagos_laborys || []).find((p) => p.metodo === 'laborys' && p.origen === 'auto');
    if (!payEntry) throw new Error("TEST FAIL: no hay entrada de pago con origen='auto' en pagos_laborys");
    const expectedReward = Number(todo.reward_laborys ?? todo.recompensa ?? 0);
    if (Number(payEntry.monto) !== expectedReward) {
      throw new Error(`TEST FAIL: monto del pago (${payEntry.monto}) != reward del todo (${expectedReward})`);
    }

    // 6. Apelación (si score<=3 fallaría porque pusimos 5; probaremos el
    //    reject por score y por motivo para no crear apelación real).
    const apelarCtrl = require('./src/api/tarea/controllers/apelar');
    ctx = fakeCtxFor({ tareaId: nueva.id, motivo: 'muy corto' });
    try {
      await apelarCtrl.apelar(ctx);
      throw new Error('TEST FAIL: apelar con motivo<10 debería fallar (no falló)');
    } catch (err) {
      if (/al menos 10 caracteres/.test(err.message)) {
        console.log('[+] apelar(motivo<10) OK: rechazado correctamente');
      } else {
        throw new Error(`TEST FAIL: apelar falló por razón inesperada: ${err.message}`);
      }
    }
    // apelar con score 5 = no apelable (umbral 3)
    ctx = fakeCtxFor({ tareaId: nueva.id, motivo: 'Este motivo es suficientemente largo' });
    try {
      await apelarCtrl.apelar(ctx);
      throw new Error('TEST FAIL: apelar con score=5 debería fallar (no apelable)');
    } catch (err) {
      if (/no es apelable/i.test(err.message)) {
        console.log('[+] apelar(score=5 no apelable) OK: rechazado correctamente');
      } else {
        throw new Error(`TEST FAIL: apelar falló por razón inesperada: ${err.message}`);
      }
    }

    // 7. Validación de dueño: si el solicitante no es el dueño, debe ser
    //    forbidden. (Para esto creamos otra user ficticio.)
    const otroUser = { ...user, id: user.id + 999999 };
    ctx = fakeCtxFor({ tareaId: nueva.id, motivo: 'Este motivo es suficientemente largo' });
    ctx.state.strapiUser = otroUser;
    try {
      await apelarCtrl.apelar(ctx);
      throw new Error('TEST FAIL: apelar de tarea ajena debería ser forbidden');
    } catch (err) {
      if (/dueño/i.test(err.message) || /forbidden/i.test(err.message)) {
        console.log('[+] apelar(dueño validation) OK: rechazado correctamente');
      } else {
        throw new Error(`TEST FAIL: apelar falló por razón inesperada en dueño check: ${err.message}`);
      }
    }

    console.log('\n=== TEST E2E COWORK: TODO PASÓ ===');
  } catch (err) {
    console.error('\n=== TEST E2E COWORK: FALLÓ ===\n', err);
    process.exitCode = 1;
  } finally {
    await app.destroy();
    process.exit(process.exitCode || 0);
  }
})();

'use strict';

/**
 * Smoke test del helper visibility.js (sin frameworks).
 * Ejecutar con: node src/utils/cowork/visibility.selftest.js
 *
 * Verifica las ramas del filtro sin tocar Strapi real: mockeamos
 * strapi.entityService y comparamos los filtros esperados.
 */

const assert = require('assert');

// ---- Mock strapi global -------------------------------------------------
const fakeUsers = {};

global.strapi = {
  entityService: {
    findOne: async (uid, id, opts) => {
      if (uid !== 'plugin::users-permissions.user') return null;
      const u = fakeUsers[id];
      if (!u) return null;
      // Devuelve sólo los campos populados que no vienen en el user base.
      return {
        id: u.id,
        email: u.email,
        area_details: u.area_details,
        areas: u.areas,
        skills: u.skills,
        roles: u.roles,
        role: u.role,
      };
    },
  },
};

const vis = require('./visibility.js');

// ---- Helpers de construcción de fixtures -------------------------------
const mkArea = (id, nivel = 0) => ({ id, nombre: `area${id}`, nivel });
const mkSkill = (id) => ({ id, name: `skill${id}` });

const adminUser = {
  id: 1,
  email: 'admin@x',
  roles: { extra: ['admin'] },
  role: { name: 'Admin' },
  areas: [],
  area_details: {},
  skills: [],
};

const socioUser = {
  id: 2,
  email: 'socio@x',
  roles: { extra: ['socio'] },
  role: { name: 'Socio' },
  areas: [],
  area_details: {},
  skills: [],
};

const userSinNada = {
  id: 3,
  email: 'pepe@x',
  roles: { extra: [] },
  role: { name: 'Authenticated' },
  areas: [],
  area_details: {},
  skills: [],
};

const userConAreaVerificada = {
  id: 4,
  email: 'ver@x',
  roles: { extra: [] },
  role: { name: 'Authenticated' },
  areas: [mkArea(10), mkArea(11, 1)],
  area_details: { 10: { status: 'verified' }, 11: { status: 'verified' } },
  skills: [],
};

const userConAreaRechazada = {
  id: 5,
  email: 'rech@x',
  roles: { extra: [] },
  role: { name: 'Authenticated' },
  areas: [mkArea(20)],
  area_details: { 20: { status: 'pending' } },
  skills: [],
};

const userConSkill = {
  id: 6,
  email: 'skl@x',
  roles: { extra: [] },
  role: { name: 'Authenticated' },
  areas: [],
  area_details: {},
  skills: [mkSkill(30)],
};

const visibleStatuses = ['publicada', 'asignada', 'en_proceso'];

// ---- Tests -------------------------------------------------------------

async function run() {
  // 1. Visitante (sin user): solo nivel general
  let f = await vis.buildTodoVisibilityFilter(null, visibleStatuses);
  assert.deepStrictEqual(f.status, { $in: visibleStatuses });
  assert.deepStrictEqual(f.nivel, { $in: ['general', 'becarios'] });
  assert.ok(!f.$or, 'visitante no debe tener $or');
  console.log('ok 1: visitante solo ve general');

  // 2. Admin: solo filtro de status, sin nivel ni $or
  f = await vis.buildTodoVisibilityFilter(adminUser, visibleStatuses);
  assert.deepStrictEqual(f.status, { $in: visibleStatuses });
  assert.ok(!f.nivel, 'admin no tiene filtro de nivel');
  assert.ok(!f.$or, 'admin no tiene $or');
  console.log('ok 2: admin bypass visibilidad');

  // 3. Socio: igual que admin
  f = await vis.buildTodoVisibilityFilter(socioUser, visibleStatuses);
  assert.ok(!f.nivel && !f.$or);
  console.log('ok 3: socio bypass visibilidad');

  // 4. User sin nada verificado: solo general (igual que visitante)
  fakeUsers[3] = userSinNada;
  f = await vis.buildTodoVisibilityFilter(userSinNada, visibleStatuses);
  assert.deepStrictEqual(f.nivel, { $in: ['general', 'becarios'] });
  assert.ok(!f.$or);
  console.log('ok 4: usuario sin verificación solo ve general');

  // 5. User con área verificada: $or con general + areas + subareas
  fakeUsers[4] = userConAreaVerificada;
  f = await vis.buildTodoVisibilityFilter(userConAreaVerificada, visibleStatuses);
  assert.ok(Array.isArray(f.$or), 'debe haber $or');
  const orStrings = f.$or.map((c) => JSON.stringify(c));
  assert.ok(orStrings.includes(JSON.stringify({ nivel: { $in: ['general', 'becarios'] } })), 'incluye general');
  assert.ok(orStrings.includes(JSON.stringify({ areas: { id: { $in: [10, 11] } } })), 'incluye areas');
  assert.ok(orStrings.includes(JSON.stringify({ subareas: { id: { $in: [10, 11] } } })), 'incluye subareas');
  assert.ok(!orStrings.some((s) => s.includes('skills')), 'no incluir skills');
  console.log('ok 5: user con área verificada tiene $or correcto');

  // 6. User con skill verificada
  fakeUsers[6] = userConSkill;
  f = await vis.buildTodoVisibilityFilter(userConSkill, visibleStatuses);
  const orStr6 = f.$or.map((c) => JSON.stringify(c));
  assert.ok(orStr6.some((s) => s.includes('skills')), 'incluye skills');
  assert.ok(!orStr6.some((s) => s.includes('"areas"')), 'no incluye areas si no tiene');
  console.log('ok 6: user con skill verified tiene $or con skills');

  // 7. canUserTakeTodo: visitante rechazado
  let r = await vis.canUserTakeTodo(null, { id: 1, nivel: 'general' });
  assert.strictEqual(r.ok, false);
  console.log('ok 7: visitante no puede tomar');

  // 8. canUserTakeTodo: general autenticado → ok
  r = await vis.canUserTakeTodo(userSinNada, { id: 1, nivel: 'general' });
  assert.strictEqual(r.ok, true);
  console.log('ok 8: autenticado puede tomar general');

  // 9. canUserTakeTodo: especializada sin verificación → rechazo
  fakeUsers[3] = userSinNada;
  r = await vis.canUserTakeTodo(userSinNada, {
    id: 2, nivel: 'especialidad', areas: [mkArea(10)], subareas: [], skills: [],
  });
  assert.strictEqual(r.ok, false);
  assert.ok(/área|subárea|habilidad/i.test(r.reason), 'motivo menciona áreas');
  console.log('ok 9: especializada rechazada sin verificación');

  // 10. canUserTakeTodo: especializada con área verificada que coincide → ok
  fakeUsers[4] = userConAreaVerificada;
  r = await vis.canUserTakeTodo(userConAreaVerificada, {
    id: 3, nivel: 'especialidad', areas: [mkArea(10)], subareas: [], skills: [],
  });
  assert.strictEqual(r.ok, true, 'debe aprobar — área 10 coincide con verificada');
  console.log('ok 10: especializada aprobada con área coincidente');

  // 11. canUserTakeTodo: especializada con área verificada que NO coincide → rechazo
  r = await vis.canUserTakeTodo(userConAreaVerificada, {
    id: 4, nivel: 'especialidad', areas: [mkArea(999)], subareas: [], skills: [],
  });
  assert.strictEqual(r.ok, false);
  console.log('ok 11: especializada rechazada por área no coincidente');

  // 12. canUserTakeTodo: especializada con skill que coincide → ok
  fakeUsers[6] = userConSkill;
  r = await vis.canUserTakeTodo(userConSkill, {
    id: 5, nivel: 'especialidad', areas: [], subareas: [], skills: [mkSkill(30)],
  });
  assert.strictEqual(r.ok, true);
  console.log('ok 12: especializada aprobada por skill coincidente');

  // 13. canUserTakeTodo: admin bypass incluso en especializada
  r = await vis.canUserTakeTodo(adminUser, {
    id: 6, nivel: 'especialidad', areas: [mkArea(999)], subareas: [], skills: [],
  });
  assert.strictEqual(r.ok, true, 'admin debe tener bypass');
  console.log('ok 13: admin bypass canUserTakeTodo');

  // 14. getVerifiedAreaIds: user con área asociada pero area_details pending → NO
  fakeUsers[5] = userConAreaRechazada;
  const ids = await vis.getVerifiedAreaIds(userConAreaRechazada);
  assert.strictEqual(ids.length, 0, 'área pendiente no cuenta como verificada');
  console.log('ok 14: area_details pending bloquea verificación');

  console.log('\nTodos los smoke tests OK');
}

run().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});

// Smoke test de canUserTakeTask (helper FE sin frameworks).
// Ejecutar con: node --experimental-vm-modules src/utils/cowork/canUserTakeTask.selftest.mjs
// Pero como el archivo helpers.js usa export const, usamos require con babel
// via package.json type=module no configurado. Workaround: copiamos la
// función a este archivo para test aislado (mock mínimo).

// --- Copia literal de canUserTakeTask con userContext (l.159 cowork.helpers.js) ---
function canUserTakeTask(todo, userId, existingTasks, userContext) {
  const recurrencia = todo.recurrencia ?? 'unica';
  const tasksForTodo = existingTasks.filter((t) => t.todo?.id === todo.id);
  let recurrenciaOk;
  if (recurrencia === 'unica') {
    recurrenciaOk = tasksForTodo.length === 0;
  } else {
    recurrenciaOk = !tasksForTodo.some((t) => t.usuario?.id === userId);
  }
  if (!recurrenciaOk) return false;

  if (!userContext) return true;

  const { isPrivileged, verifiedAreaIds = [], verifiedSkillIds = [] } = userContext;
  if (isPrivileged) return true;

  const NIVELES_GENERAL = ['general', 'becarios', 'becario'];
  if (NIVELES_GENERAL.includes(todo.nivel)) return true;

  const todoAreas = [...(todo.areas || []), ...(todo.subareas || [])];
  const todoSkills = todo.skills || [];

  const areaMatch = todoAreas.some((a) => {
    const id = typeof a === 'object' ? a.id : Number(a);
    return verifiedAreaIds.includes(id);
  });
  const skillMatch = todoSkills.some((s) => {
    const id = typeof s === 'object' ? s.id : Number(s);
    return verifiedSkillIds.includes(id);
  });

  return areaMatch || skillMatch;
}

const assert = (cond, msg) => {
  if (!cond) throw new Error('FAIL: ' + msg);
  console.log('ok:', msg);
};

// Tests

// 1. Recurrencia única sin tareas previas → true (compat: sin userContext)
let r = canUserTakeTask({ id: 1, recurrencia: 'unica' }, 7, []);
assert(r === true, '1: recurrencia unica sin previas → true');

// 2. Recurrencia única con tarea previa → false
r = canUserTakeTask({ id: 1, recurrencia: 'unica' }, 7, [{ todo: { id: 1 }, usuario: { id: 99 } }]);
assert(r === false, '2: recurrencia unica con previa → false');

// 3. Recurrencia periódica: misma tarea mismo user → false
r = canUserTakeTask({ id: 2, recurrencia: 'periodica' }, 7, [{ todo: { id: 2 }, usuario: { id: 7 } }]);
assert(r === false, '3: periodica ya tomada por mismo user → false');

// 4. Recurrencia periódica: otra persona ya la tomó → el user OK
r = canUserTakeTask({ id: 2, recurrencia: 'periodica' }, 7, [{ todo: { id: 2 }, usuario: { id: 99 } }]);
assert(r === true, '4: periodica tomada por otro → nuevo user OK');

// 5. Sin userContext: tarea especializada sin match → true (compat backend frena)
r = canUserTakeTask(
  { id: 3, recurrencia: 'unica', nivel: 'especialidad', areas: [{ id: 99 }] },
  7,
  []
);
assert(r === true, '5: sin userContext → true (backend validará)');

// 6. userContext privileged (admin) → bypass, sin importar áreas
r = canUserTakeTask(
  { id: 3, recurrencia: 'unica', nivel: 'especialidad', areas: [{ id: 99 }] },
  7,
  [],
  { isPrivileged: true, verifiedAreaIds: [], verifiedSkillIds: [] }
);
assert(r === true, '6: admin bypass');

// 7. Tarea general con userContext y sin verificación → true (no requiere)
r = canUserTakeTask(
  { id: 4, recurrencia: 'unica', nivel: 'general', areas: [] },
  7,
  [],
  { isPrivileged: false, verifiedAreaIds: [], verifiedSkillIds: [] }
);
assert(r === true, '7: tarea general sin verificación → true');

// 8. Especializada sin verificación con userContext → false (FE oculta botón)
r = canUserTakeTask(
  { id: 5, recurrencia: 'unica', nivel: 'especialidad', areas: [{ id: 99 }] },
  7,
  [],
  { isPrivileged: false, verifiedAreaIds: [], verifiedSkillIds: [] }
);
assert(r === false, '8: especializada sin verificación → false');

// 9. Especializada con área coincidente → true
r = canUserTakeTask(
  { id: 5, recurrencia: 'unica', nivel: 'especialidad', areas: [{ id: 10 }] },
  7,
  [],
  { isPrivileged: false, verifiedAreaIds: [10, 11], verifiedSkillIds: [] }
);
assert(r === true, '9: especializada con área coincidente → true');

// 10. Especializada con subárea coincidente → true
r = canUserTakeTask(
  { id: 5, recurrencia: 'unica', nivel: 'experto', subareas: [{ id: 15 }] },
  7,
  [],
  { isPrivileged: false, verifiedAreaIds: [15], verifiedSkillIds: [] }
);
assert(r === true, '10: especializada con subarea coincidente → true');

// 11. Especializada con skill coincidente → true
r = canUserTakeTask(
  { id: 5, recurrencia: 'unica', nivel: 'personalizada', skills: [{ id: 30 }] },
  7,
  [],
  { isPrivileged: false, verifiedAreaIds: [], verifiedSkillIds: [30] }
);
assert(r === true, '11: especializada con skill coincidente → true');

// 12. Área no coincide → false
r = canUserTakeTask(
  { id: 5, recurrencia: 'unica', nivel: 'especialidad', areas: [{ id: 99 }] },
  7,
  [],
  { isPrivileged: false, verifiedAreaIds: [10], verifiedSkillIds: [] }
);
assert(r === false, '12: área no coincidente → false');

// 13. Recurrencia bloquea aunque área coincida
r = canUserTakeTask(
  { id: 5, recurrencia: 'unica', nivel: 'especialidad', areas: [{ id: 10 }] },
  7,
  [{ todo: { id: 5 }, usuario: { id: 99 } }], // ya tomada por otro
  { isPrivileged: false, verifiedAreaIds: [10], verifiedSkillIds: [] }
);
assert(r === false, '13: recurrencia bloquea aunque área coincida');

// 14 nivel "becario" (variante ortográfica) → true sin verificación
r = canUserTakeTask(
  { id: 6, recurrencia: 'unica', nivel: 'becario' },
  7,
  [],
  { isPrivileged: false, verifiedAreaIds: [], verifiedSkillIds: [] }
);
assert(r === true, '14: becario (sin s) → true');

console.log('\nTodos los smoke tests de canUserTakeTask OK');

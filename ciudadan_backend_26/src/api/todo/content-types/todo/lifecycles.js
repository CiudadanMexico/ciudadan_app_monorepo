'use strict';

// Transiciones de estado válidas para un `todo` (tarea original).
// Cualquier transición no listada aquí será rechazada.
// Spec: documento-off.md línea 138
const VALID_TRANSITIONS = {
  'borrador':           ['publicada', 'asignada', 'cancelada'],
  'publicada':          ['asignada', 'en_proceso', 'pendiente_revision', 'corregir', 'corregida', 'calificada', 'pagada', 'cancelada'],
  'asignada':           ['en_proceso', 'pendiente_revision', 'corregir', 'corregida', 'calificada', 'pagada', 'cancelada'],
  'en_proceso':         ['pendiente_revision', 'corregir', 'corregida', 'calificada', 'pagada', 'cancelada'],
  'pendiente_revision': ['corregir', 'corregida', 'calificada', 'cancelada'],
  'corregir':           ['corregida', 'calificada', 'cancelada'],
  'corregida':          ['calificada', 'pagada', 'cancelada'],
  'calificada':         ['pagada', 'cancelada'],
  'pagada':             [],
  'cancelada':          [],
};

function isValidTransition(from, to) {
  if (!from || from === to) return true;
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

module.exports = {
  async beforeUpdate(event) {
    const { data, where } = event.params;
    if (data.status === undefined) return;

    const prev = await strapi.entityService.findOne('api::todo.todo', where.id, {
      fields: ['status'],
    });
    if (!prev) return;

    const prevStatus = prev.status;
    const newStatus = data.status;
    if (newStatus && prevStatus && prevStatus !== newStatus) {
      if (!isValidTransition(prevStatus, newStatus)) {
        throw new Error(
          `Transición de estado inválida para el todo: '${prevStatus}' -> '${newStatus}'. ` +
          `Transiciones permitidas desde '${prevStatus}': ` +
          `${(VALID_TRANSITIONS[prevStatus] || []).join(', ') || 'ninguna'}`
        );
      }
    }
  },
};

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

/**
 * Extrae un id de relación tolerando las formas que usa Strapi v4 en los
 * params de los lifecycles: 12 | '12' | { id } | { connect: [{ id }] } |
 * { set: [{ id }] } | [{ id }].
 */
function extractRelationId(valor) {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'number' || typeof valor === 'string') {
    const numero = Number(valor);
    return Number.isNaN(numero) ? null : numero;
  }
  if (Array.isArray(valor)) return extractRelationId(valor.find(Boolean));
  if (typeof valor === 'object') {
    if (valor.id !== undefined) return extractRelationId(valor.id);
    if (valor.connect) return extractRelationId(valor.connect);
    if (valor.set) return extractRelationId(valor.set);
  }
  return null;
}

module.exports = {
  /**
   * Al CREAR un `todo`, si viene `creador` y no se especificó `agencia`, se
   * etiqueta automáticamente la agencia del creador.
   *
   * Motivo (TodoToken): la pantalla "Mis tareas publicadas" filtra por
   * `creador + agencia + status = publicada`. El formulario de CoWork envía el
   * creador pero no la agencia, así que sin esto las tareas publicadas por un
   * socio nacían con `agencia = null` y no podían asociarse a su agencia.
   *
   * Se resuelve aquí, server-side, para que TODAS las vías de creación
   * (formulario, panel de administración, scripts) queden consistentes y para
   * no depender de un dato que envía el navegador.
   */
  async beforeCreate(event) {
    const { data } = event.params;
    if (!data) return;
    if (data.agencia) return; // ya viene definida explícitamente

    const creadorId = extractRelationId(data.creador) ?? extractRelationId(data.created_by);
    if (!creadorId) return;

    const usuario = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: creadorId },
      populate: { agencia: true },
    });

    if (!usuario?.agencia) return; // sin agencia: no se inventa ninguna

    data.agencia = usuario.agencia.id;
    if (!data.agencianombre) data.agencianombre = usuario.agencia.nombre || null;
  },

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

'use strict';

const TERMINAL_STATUSES = ['calificada', 'pagada', 'cancelada'];

// Transiciones de estado válidas para una tarea.
// Cualquier transición no listada aquí será rechazada.
const VALID_TRANSITIONS = {
  'en_proceso': ['completada', 'cancelada'],
  'completada': ['corregir', 'corregida', 'calificada', 'cancelada'],
  'corregir': ['corregida', 'cancelada'],
  'corregida': ['calificada', 'corregir', 'cancelada'],
  'calificada': ['pagada'],
  'pagada': [],
  'cancelada': [],
  'modificada': ['en_proceso', 'completada'],
};

function isValidTransition(from, to) {
  if (!from || from === to) return true;
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

function resolveTodoId(todo) {
  if (!todo) return null;
  if (typeof todo === 'number') return todo;
  if (todo.connect?.[0]?.id) return todo.connect[0].id;
  if (todo.id) return todo.id;
  if (todo.set?.id) return todo.set.id;
  return null;
}

module.exports = {
  async beforeCreate(event) {
    const { data } = event.params;
    const todoId = resolveTodoId(data.todo);

    if (todoId) {
      const todo = await strapi.entityService.findOne('api::todo.todo', todoId, {
        fields: ['id', 'status', 'recurrencia'],
      });
      if (!todo) {
        throw new Error('El todo asociado no existe');
      }
      if (TERMINAL_STATUSES.includes(todo.status)) {
        throw new Error('El todo ya tiene un estado que bloquea su actualización');
      }
      event.state.todoId = todoId;
      event.state.recurrencia = todo.recurrencia || 'unica';
    }
  },

  async afterCreate(event) {
    const { todoId, recurrencia } = event.state;
    if (todoId && recurrencia === 'unica') {
      await strapi.entityService.update('api::todo.todo', todoId, {
        data: { status: 'en_proceso' },
      });
    }
  },

  async beforeUpdate(event) {
    const { data, where } = event.params;

    if (data.status === undefined) return;

    const prev = await strapi.entityService.findOne('api::tarea.tarea', where.id, {
      fields: ['status', 'payment_status'],
      populate: { todo: { fields: ['id', 'status', 'recurrencia'] } },
    });

    if (!prev) return;

    const prevStatus = prev.status;
    const newStatus = data.status;
    if (newStatus && prevStatus && prevStatus !== newStatus) {
      if (!isValidTransition(prevStatus, newStatus)) {
        throw new Error(
          `Transición de estado inválida: '${prevStatus}' -> '${newStatus}'. ` +
          `Transiciones permitidas desde '${prevStatus}': ` +
          `${(VALID_TRANSITIONS[prevStatus] || []).join(', ') || 'ninguna'}`
        );
      }
    }

    event.state.prevStatus = prev.status;
    event.state.prevPaymentStatus = prev.payment_status;
    event.state.todoId = resolveTodoId(prev.todo);
    event.state.todoStatus = prev.todo?.status;
  },

  /**
   * Propagación de estados terminales al `todo` padre.
   *
   * El pago automático de laborys es responsabilidad del controller `calificar.js`,
   * envuelto en una transacción DB para garantizar atomicidad. Este lifecycle
   * no duplica la acreditación (eso introducía inconsistencias silenciosas en
   * el happy path y un estado `payment_status: procesado` falso en el unhappy
   * path — ver bug crítico #1 del módulo CoWork).
   */
  async afterUpdate(event) {
    const { result } = event;
    const { prevStatus, todoId } = event.state || {};
    const newStatus = result.status;

    // Pagada -> propagar al todo padre (transición validada por el lifecycle
    // del todo, que ahora sí tiene su propia VALID_TRANSITIONS).
    if (newStatus === 'pagada' && prevStatus !== 'pagada') {
      if (todoId) {
        await strapi.entityService.update('api::todo.todo', todoId, {
          data: { status: 'pagada' },
        });
      }
    }

    // Cancelada -> cancelar todo padre si era la única resolución activa.
    if (newStatus === 'cancelada' && prevStatus !== 'cancelada' && todoId) {
      const todo = await strapi.entityService.findOne('api::todo.todo', todoId, {
        populate: { tareas: { fields: ['id', 'status'] } },
      });
      const tareasActivas = (todo?.tareas || []).filter(
        (t) => !['cancelada', 'pagada'].includes(t.status)
      );
      if (tareasActivas.length === 0) {
        await strapi.entityService.update('api::todo.todo', todoId, {
          data: { status: 'cancelada' },
        });
      }
    }
  },
};

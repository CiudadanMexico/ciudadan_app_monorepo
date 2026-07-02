'use strict';

const TERMINAL_STATUSES = ['calificada', 'pagada', 'cancelada'];

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
};

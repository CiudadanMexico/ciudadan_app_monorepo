'use strict';

/**
 * POST /tareas/resolver
 *
 * Un usuario autenticado toma una `todo` publicada creando una `tarea`
 * (resolución). Antes de asignar valida (spec documento-off.md líneas 32-35):
 *   - El todo está en estado `publicada`.
 *   - Si la `todo` es especializada (nivel especialidad/experto/personalizada),
 *     el usuario debe tener área/subárea o habilidad verificada que coincida.
 *   - Admin/socio: bypass (gestión completa de tareas).
 */

const { canUserTakeTodo } = require('../../../utils/cowork/visibility');

module.exports = {
  async resolver(ctx) {
    const { todoId } = ctx.request.body || {};
    const user = ctx.state.strapiUser;

    if (!user) return ctx.throw(401, 'No autenticado');
    if (!todoId) return ctx.throw(400, 'todoId es requerido');

    const todo = await strapi.entityService.findOne('api::todo.todo', todoId, {
      fields: ['id', 'status', 'nivel'],
      populate: { areas: true, subareas: true, skills: true },
    });

    if (!todo) return ctx.throw(404, 'La tarea no existe');
    if (todo.status !== 'publicada') {
      return ctx.throw(400, 'Esta tarea ya no está disponible para ser asignada');
    }

    // Validación de visibilidad/permiso por área/skill verificada.
    const check = await canUserTakeTodo(user, todo);
    if (!check.ok) {
      return ctx.throw(403, check.reason);
    }

    const tarea = await strapi.entityService.create('api::tarea.tarea', {
      data: {
        usuario: user.id,
        todo: todoId,
        tipo: 'tarea',
        status: 'en_proceso',
        payment_status: 'pendiente',
        // timestamp de toma (cuando el usuario empieza a resolver).
        // Se reescribe al calificar (calificar.js) como timestamp de cierre,
        // manteniendo ambos timestamps en el mismo campo según spec 4.2.
        resolved_at: new Date().toISOString(),
      },
    });

    await strapi.entityService.update('api::todo.todo', todoId, {
      data: { status: 'asignada' },
    });

    ctx.body = { data: tarea };
  },
};

'use strict';

module.exports = {
  async completar(ctx) {
    const { tareaId: id } = ctx.request.body || {};
    const user = ctx.state.strapiUser;

    if (!user) return ctx.throw(401, 'No autenticado');
    if (!id) return ctx.throw(400, 'tareaId es requerido');

    const tarea = await strapi.entityService.findOne('api::tarea.tarea', id, {
      populate: ['usuario', 'todo'],
    });

    if (!tarea) return ctx.throw(404, 'La tarea no existe');
    if (!tarea.usuario || tarea.usuario.id !== user.id) {
      return ctx.throw(403, 'Solo el dueño de esta tarea puede marcarla como completada');
    }
    if (!tarea.todo) return ctx.throw(400, 'Esta tarea no tiene un todo asociado');

    const updatedTarea = await strapi.entityService.update('api::tarea.tarea', tarea.id, {
      data: {
        status: 'completada',
        resolved_at: new Date().toISOString(),
      },
    });

    const todo = await strapi.entityService.update('api::todo.todo', tarea.todo.id, {
      data: { status: 'pendiente_revision' },
    });

    ctx.body = { data: { tarea: updatedTarea, todo } };
  },
};

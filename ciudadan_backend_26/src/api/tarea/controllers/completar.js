'use strict';

/**
 * POST /tareas/completar
 *
 * El dueño de la tarea marca su avance como entregado. Es state-aware: si
 * la tarea venía de un `corregir` (spec documento-off.md: "el usuario
 * corrige y vuelve a marcar completar"), el destino es `corregida`, no
 * `completada` de nuevo — `completada` desde `corregir` NO es una
 * transición válida del lifecycle (solo `corregir → corregida|cancelada`),
 * así que reenviar tras una corrección tiraba siempre "Transición de
 * estado inválida" (bug encontrado corriendo el flujo real completo).
 * `calificar.js` ya acepta ambos estados (`completada`/`corregida`) como
 * calificables, así que este cambio no rompe nada aguas abajo.
 */
// Máximo de enlaces que se pueden mandar por entrega (evita payloads
// absurdos; los archivos van aparte por /tareas/subir-evidencia).
const MAX_ENLACES = 10;
const MAX_ENLACE_LEN = 2000;

module.exports = {
  async completar(ctx) {
    const { tareaId: id, notes, enlaces } = ctx.request.body || {};
    const user = ctx.state.strapiUser;

    if (!user) return ctx.throw(401, 'No autenticado');
    if (!id) return ctx.throw(400, 'tareaId es requerido');

    // Enlaces son opcionales: el usuario puede entregar solo con notas,
    // solo con archivos (vía /tareas/subir-evidencia por separado), o con
    // ambos. No lo hacemos obligatorio para no romper el flujo de tareas
    // simples que no requieren evidencia (ej. tareas de gestión/reportes).
    let enlacesLimpios;
    if (enlaces !== undefined) {
      if (!Array.isArray(enlaces)) {
        return ctx.throw(400, 'enlaces debe ser un arreglo de URLs');
      }
      if (enlaces.length > MAX_ENLACES) {
        return ctx.throw(400, `No se pueden mandar más de ${MAX_ENLACES} enlaces`);
      }
      enlacesLimpios = enlaces
        .map((e) => String(e || '').trim())
        .filter(Boolean)
        .map((e) => e.slice(0, MAX_ENLACE_LEN));
    }

    const tarea = await strapi.entityService.findOne('api::tarea.tarea', id, {
      populate: ['usuario', 'todo'],
    });

    if (!tarea) return ctx.throw(404, 'La tarea no existe');
    if (!tarea.usuario || tarea.usuario.id !== user.id) {
      return ctx.throw(403, 'Solo el dueño de esta tarea puede marcarla como completada');
    }
    if (!tarea.todo) return ctx.throw(400, 'Esta tarea no tiene un todo asociado');

    const reenvioTrasCorreccion = tarea.status === 'corregir';
    const targetTareaStatus = reenvioTrasCorreccion ? 'corregida' : 'completada';
    const targetTodoStatus = reenvioTrasCorreccion ? 'corregida' : 'pendiente_revision';

    const dataTarea = {
      status: targetTareaStatus,
      resolved_at: new Date().toISOString(),
    };
    if (typeof notes === 'string') dataTarea.notes = notes.slice(0, 5000);
    if (enlacesLimpios !== undefined) dataTarea.enlaces = enlacesLimpios;

    const updatedTarea = await strapi.entityService.update('api::tarea.tarea', tarea.id, {
      data: dataTarea,
    });

    const todo = await strapi.entityService.update('api::todo.todo', tarea.todo.id, {
      data: { status: targetTodoStatus },
    });

    ctx.body = { data: { tarea: updatedTarea, todo } };
  },
};

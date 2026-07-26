'use strict';

/**
 * POST /tareas/corregir
 *
 * Un verificador (o admin) devuelve una tarea completada para que el
 * usuario la corrija. La tarea pasa de `completada` → `corregir` y el
 * todo asociado también pasa a `corregir`.
 *
 * Flujo (según documento-off.md):
 *   1. Solo un verificador/admin puede pedir corrección.
 *   2. La tarea debe estar en estado `completada` (pendiente de revisión).
 *   3. Se guarda la nota de corrección en `validaciones`.
 *   4. La tarea pasa a `corregir`.
 *   5. El todo pasa a `corregir`.
 *   6. El usuario corrige y vuelve a marcar `completar` → la tarea pasa
 *      a `completada` de nuevo, y luego el verificador puede calificar.
 */

// Estados desde los que se puede pedir corrección. Debe coincidir con
// VALID_TRANSITIONS del lifecycle: `completada → corregir` y `corregida →
// corregir` (permite re-corregir tras una corrección previa).
const ESTADOS_CORREGIBLES = ['completada', 'corregida'];

module.exports = {
  async corregir(ctx) {
    const { tareaId, notes } = ctx.request.body || {};
    const reviewer = ctx.state.strapiUser;

    // --- 1. Validaciones de entrada ---
    if (!reviewer) return ctx.throw(401, 'No autenticado');
    if (!tareaId) return ctx.throw(400, 'tareaId es requerido');

    // --- 2. Cargar la tarea con relaciones ---
    const tarea = await strapi.entityService.findOne('api::tarea.tarea', tareaId, {
      populate: ['usuario', 'todo'],
    });

    if (!tarea) return ctx.throw(404, 'La tarea no existe');
    if (!tarea.todo) return ctx.throw(400, 'La tarea no tiene un todo asociado');

    // --- 3. Validar estado actual ---
    if (!ESTADOS_CORREGIBLES.includes(tarea.status)) {
      return ctx.throw(
        400,
        `La tarea debe estar en estado ${ESTADOS_CORREGIBLES.join(' o ')} para solicitar corrección (actual: ${tarea.status})`
      );
    }

    // --- 4. Construir entrada de validación (corrección solicitada) ---
    const validacionesPrevias = Array.isArray(tarea.validaciones) ? tarea.validaciones : [];
    const nuevaValidacion = {
      tipo: 'correccion_solicitada',
      notes: notes || '',
      reviewed_by: reviewer.email || reviewer.id,
      fecha: new Date().toISOString(),
    };

    // --- 5. Actualizar tarea → corregir ---
    const tareaCorregida = await strapi.entityService.update('api::tarea.tarea', tarea.id, {
      data: {
        status: 'corregir',
        validaciones: [...validacionesPrevias, nuevaValidacion],
      },
    });

    // --- 6. Actualizar el todo original → corregir ---
    const todoActualizado = await strapi.entityService.update('api::todo.todo', tarea.todo.id, {
      data: { status: 'corregir' },
    });

    // --- 7. Respuesta ---
    ctx.body = {
      data: {
        tarea: tareaCorregida,
        todo: todoActualizado,
        mensaje: 'Tarea devuelta para corrección',
      },
    };
  },
};

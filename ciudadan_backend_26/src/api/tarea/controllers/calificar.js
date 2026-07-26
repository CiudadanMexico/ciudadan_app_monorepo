'use strict';

/**
 * POST /tareas/calificar
 *
 * Califica una resolución (tarea) y ejecuta el pago automático en laborys.
 * Flujo atómico: todos los cambios (tarea → calificada/pagada, cartera, todo → pagada)
 * se ejecutan dentro de una transacción DB. Si cualquier paso falla, se hace
 * rollback y ningún estado queda inconsistente.
 *
 * Spec: documento-off.md:127 — "Al calificar una tarea, el pago en laborys
 * se ejecuta automáticamente".
 */

const ESTADOS_CALIFICABLES = ['completada', 'corregida'];
const PAGO_LABORYS_ENTRY = 'laborys';

module.exports = {
  async calificar(ctx) {
    const { tareaId, score, notes } = ctx.request.body || {};
    const reviewer = ctx.state.strapiUser;

    // --- 1. Validaciones de entrada (síncronas, fuera de tx) ---
    if (!reviewer) return ctx.throw(401, 'No autenticado');
    if (!tareaId) return ctx.throw(400, 'tareaId es requerido');
    if (score === undefined || score === null) {
      return ctx.throw(400, 'score es requerido');
    }
    const scoreNum = Number(score);
    if (Number.isNaN(scoreNum)) return ctx.throw(400, 'score debe ser un número');

    // --- 2. Cargar la tarea + todo (fuera de tx para no bloquear) ---
    const tarea = await strapi.entityService.findOne('api::tarea.tarea', tareaId, {
      populate: ['usuario', 'todo'],
    });
    if (!tarea) return ctx.throw(404, 'La tarea no existe');
    if (!tarea.usuario) return ctx.throw(400, 'La tarea no tiene un usuario asignado');
    if (!tarea.todo) return ctx.throw(400, 'La tarea no tiene un todo asociado');

    if (!ESTADOS_CALIFICABLES.includes(tarea.status)) {
      return ctx.throw(
        400,
        `La tarea debe estar en estado ${ESTADOS_CALIFICABLES.join(' o ')} para ser calificada (actual: ${tarea.status})`
      );
    }

    const todo = await strapi.entityService.findOne('api::todo.todo', tarea.todo.id, {
      fields: ['id', 'status', 'reward_laborys', 'recompensa'],
    });
    if (!todo) return ctx.throw(404, 'El todo asociado no existe');

    const montoLaborys = Number(todo.reward_laborys ?? todo.recompensa ?? 0);
    if (montoLaborys < 0) return ctx.throw(400, 'El monto de recompensa no puede ser negativo');

    const calificacionesPrevias = Array.isArray(tarea.calificaciones) ? tarea.calificaciones : [];
    const nuevaCalificacion = {
      score: scoreNum,
      notes: notes || '',
      reviewed_by: reviewer.email || reviewer.id,
      fecha: new Date().toISOString(),
    };

    const pagosPrevios = Array.isArray(tarea.pagos_laborys) ? tarea.pagos_laborys : [];
    const pagoEntry = {
      metodo: PAGO_LABORYS_ENTRY,
      monto: montoLaborys,
      fecha: new Date().toISOString(),
      origen: 'auto',
    };

    let tareaPagada;
    let todoActualizado;
    let carteraId = null;
    let acreditado = false;

    // --- 3. Transacción atómica: tarea → calificada → pagada + cartera + todo → pagada ---
    // Spec documento-off.md líneas 62, 138: el flujo es
    //   ... → calificada → pagada
    // El controller anterior saltaba directo a `pagada`, lo que rompía el
    // VALID_TRANSITIONS del lifecycle (completada → pagada no está listado)
    // y no dejaba rastro del estado intermedio `calificada`. Aquí hacemos
    // las dos transiciones válidas en cadena dentro de la misma tx:
    //   3a1. completada/corregida → calificada (inserta calificación)
    //   3a2. calificada → pagada (inserta pago, payment_status=procesado)
    try {
      await strapi.db.transaction(async () => {
        // 3a1. Primera transición: → calificada (con calificación nueva)
        await strapi.entityService.update('api::tarea.tarea', tarea.id, {
          data: {
            status: 'calificada',
            score: scoreNum,
            reviewed_by: reviewer.id,
            calificaciones: [...calificacionesPrevias, nuevaCalificacion],
          },
        });

        // 3a2. Segunda transición: calificada → pagada + payment_status + pago.
        // resolved_at se sobreescribe aquí como timestamp de cierre
        // (antes fue seteado como timestamp de toma en resolver.js).
        tareaPagada = await strapi.entityService.update('api::tarea.tarea', tarea.id, {
          data: {
            status: 'pagada',
            pagos_laborys: [...pagosPrevios, pagoEntry],
            payment_status: 'procesado',
            resolved_at: new Date().toISOString(),
          },
        });

        // 3b. Acreditar laborys en la cartera del usuario (si hay monto).
        if (montoLaborys > 0) {
          const cartera = await strapi.db.query('api::cartera.cartera').findOne({
            where: { user_id: tarea.usuario.id },
          });

          if (cartera) {
            await strapi.db.query('api::cartera.cartera').update({
              where: { id: cartera.id },
              data: {
                laborysGanados: Number(cartera.laborysGanados ?? 0) + montoLaborys,
                laborysSaldo: Number(cartera.laborysSaldo ?? 0) + montoLaborys,
              },
            });
            carteraId = cartera.id;
          } else {
            const nueva = await strapi.db.query('api::cartera.cartera').create({
              data: {
                laborysGanados: montoLaborys,
                laborysSaldo: montoLaborys,
                user_id: tarea.usuario.id,
              },
            });
            carteraId = nueva.id;
          }
          acreditado = true;
        }

        // 3c. Propagar el todo a 'pagada' respetando la cadena de transiciones
        //     del lifecycle del todo. El todo podría estar en 'pendiente_revision',
        //     'asignada', 'en_proceso', 'corregir' o 'corregida' al momento de
        //     calificar la resolución. El lifecycle del todo NO permite saltar
        //     de 'pendiente_revision' directo a 'pagada'; debe pasar por
        //     'calificada'. Para no depender del estado actual del todo, hacemos
        //     dos transiciones atómicas en cadena:
        //       todo: <actual> → calificada → pagada
        //     (Si el todo ya estaba en 'calificada', el primer update es no-op
        //     porque isValidTransition devuelve true cuando from===to.)
        await strapi.entityService.update('api::todo.todo', tarea.todo.id, {
          data: { status: 'calificada' },
        });
        todoActualizado = await strapi.entityService.update('api::todo.todo', tarea.todo.id, {
          data: { status: 'pagada' },
        });
      });
    } catch (err) {
      strapi.log.error('calificar: fallo en transacción de pago', err);
      return ctx.throw(500, 'Error al procesar la calificación y el pago de laborys');
    }

    // --- 4. Respuesta (mismo shape que antes para no romper frontend) ---
    ctx.body = {
      data: {
        tarea: tareaPagada,
        todo: todoActualizado,
        pago: {
          monto_laborys: montoLaborys,
          acreditado,
          cartera_id: carteraId,
        },
      },
    };
  },
};

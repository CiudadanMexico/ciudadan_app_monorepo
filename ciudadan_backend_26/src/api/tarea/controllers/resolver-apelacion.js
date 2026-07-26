'use strict';

/**
 * POST /tareas/resolver-apelacion
 *
 * Aprueba o rechaza una apelación abierta de una tarea. Si se aprueba con un
 * scoreSolicitado mayor al scoreActual, se re-paga la diferencia de laborys
 * al usuario (depósito adicional en cartera + nueva entrada en pagos_laborys).
 *
 * Body:
 *   tareaId          — id de la tarea a resolver apelación (requerido)
 *   apelacionId      — id (string) de la apelación dentro de tarea.apelaciones (requerido)
 *   decision         — 'aprobada' | 'rechazada' (requerido)
 *   notasResolucion  — texto (opcional; obligatorio si rechazada)
 *   scoreFinal       — nuevo score a aplicar si se aprueba (opcional, 1-5;
 *                      si se omite, usa scoreSolicitado de la apelación)
 *
 * Reglas:
 *   - Solo admin/socio (policy global::is-admin-or-socio) puede resolver.
 *   - La apelación debe existir y estar en estado 'abierta' o 'en_revision'.
 *   - Si scoreFinal > scoreActual: re-paga diferencia de laborys en cartera
 *     y agrega entrada en pagos_laborys con origen 'auto-repago-apelacion'.
 *   - Mutea el entry de la apelación: estado, resuelta_por, fecha_resolucion,
 *     score_final, notas_resolucion.
 *
 * Spec: documento-off.md:176 — endpoint de resolución de apelaciones.
 */

const ESTADOS_RESOLUBLES = ['abierta', 'en_revision'];
const PAGO_ENTRY = 'laborys';

module.exports = {
  async resolverApelacion(ctx) {
    const reviewer = ctx.state.strapiUser;
    if (!reviewer) return ctx.throw(401, 'No autenticado');

    const { tareaId, apelacionId, decision, notasResolucion, scoreFinal } = ctx.request.body || {};

    // 1. Validaciones de entrada
    if (!tareaId) return ctx.throw(400, 'tareaId es requerido');
    if (!apelacionId) return ctx.throw(400, 'apelacionId es requerido');
    if (!decision) return ctx.throw(400, 'decision es requerido');
    if (!['aprobada', 'rechazada'].includes(decision)) {
      return ctx.throw(400, "decision debe ser 'aprobada' o 'rechazada'");
    }
    let scoreFinalNum = null;
    if (scoreFinal !== undefined && scoreFinal !== null) {
      scoreFinalNum = Number(scoreFinal);
      if (Number.isNaN(scoreFinalNum) || scoreFinalNum < 1 || scoreFinalNum > 5) {
        return ctx.throw(400, 'scoreFinal debe ser un número entre 1 y 5');
      }
    }
    const notas = notasResolucion !== undefined ? String(notasResolucion).slice(0, 2000) : '';
    if (decision === 'rechazada' && !notas.trim()) {
      return ctx.throw(400, 'notasResolucion es requerido cuando decision=rechazada');
    }

    // 2. Cargar tarea
    const tarea = await strapi.entityService.findOne('api::tarea.tarea', tareaId, {
      fields: ['id', 'status', 'score', 'apelaciones', 'pagos_laborys', 'payment_status'],
      populate: { usuario: true, todo: true },
    });
    if (!tarea) return ctx.throw(404, 'Tarea no existe');
    if (!tarea.usuario) return ctx.throw(400, 'La tarea no tiene usuario asignado');

    const apelacionesPrev = Array.isArray(tarea.apelaciones) ? tarea.apelaciones : [];
    const idx = apelacionesPrev.findIndex((a) => a.id === apelacionId);
    if (idx === -1) return ctx.throw(404, `Apelación ${apelacionId} no encontrada`);

    const apelacion = apelacionesPrev[idx];
    if (!ESTADOS_RESOLUBLES.includes(apelacion.estado)) {
      return ctx.throw(
        400,
        `La apelación ya fue resuelta (estado: ${apelacion.estado})`
      );
    }

    // 3. Resolver scores
    const scoreActual = Number(apelacion.scoreActual ?? tarea.score ?? 0);
    const scoreFinalResolved =
      decision === 'aprobada'
        ? (scoreFinalNum !== null ? scoreFinalNum : Number(apelacion.scoreSolicitado) || scoreActual)
        : scoreActual;

    // 4. Patch de la apelación (mismos campos, estado resuelto)
    const fechaResolucion = new Date().toISOString();
    const reviewerEmail = reviewer.email || reviewer.username || String(reviewer.id);
    const nuevaApelacion = {
      ...apelacion,
      estado: decision,
      resuelta_por: reviewerEmail,
      resuelta_por_id: reviewer.id,
      fecha_resolucion: fechaResolucion,
      score_final: decision === 'aprobada' ? scoreFinalResolved : null,
      notas_resolucion: notas,
    };
    const nuevasApelaciones = [...apelacionesPrev];
    nuevasApelaciones[idx] = nuevaApelacion;

    // 5. Preparar datos update de tarea
    const updateData = { apelaciones: nuevasApelaciones };
    if (decision === 'aprobada' && scoreFinalResolved !== scoreActual) {
      updateData.score = scoreFinalResolved;
    }

    // 6. Repago de laborys si score subió
    let repagoInfo = null;
    if (decision === 'aprobada' && scoreFinalResolved > scoreActual && tarea.todo) {
      const todo = await strapi.entityService.findOne('api::todo.todo', tarea.todo.id, {
        fields: ['id', 'reward_laborys', 'recompensa'],
      });
      const reward = Number(todo?.reward_laborys ?? todo?.recompensa ?? 0);

      if (reward > 0) {
        const pagosPrev = Array.isArray(tarea.pagos_laborys) ? tarea.pagos_laborys : [];
        const fechaPago = new Date().toISOString();
        const pagoEntry = {
          metodo: PAGO_ENTRY,
          monto: reward,
          fecha: fechaPago,
          origen: 'auto-repago-apelacion',
          motivo: `Re-pago por apelación aprobada (score ${scoreActual} → ${scoreFinalResolved})`,
        };
        updateData.pagos_laborys = [...pagosPrev, pagoEntry];

        try {
          await strapi.db.transaction(async () => {
            // Update la tarea con todos los cambios
            await strapi.entityService.update('api::tarea.tarea', tarea.id, { data: updateData });

            // Depositar laborys en cartera
            const cartera = await strapi.db
              .query('api::cartera.cartera')
              .findOne({ where: { user_id: tarea.usuario.id } });

            if (cartera) {
              await strapi.db.query('api::cartera.cartera').update({
                where: { id: cartera.id },
                data: {
                  laborysGanados: Number(cartera.laborysGanados ?? 0) + reward,
                  laborysSaldo: Number(cartera.laborysSaldo ?? 0) + reward,
                },
              });
              repagoInfo = { cartera_id: cartera.id, monto: reward };
            } else {
              const nueva = await strapi.db.query('api::cartera.cartera').create({
                data: {
                  laborysGanados: reward,
                  laborysSaldo: reward,
                  user_id: tarea.usuario.id,
                },
              });
              repagoInfo = { cartera_id: nueva.id, monto: reward };
            }
          });
        } catch (err) {
          strapi.log.error('resolver-apelacion: fallo en transacción de re-pago', err);
          return ctx.throw(500, 'Error al procesar el re-pago de la apelación');
        }
      } else {
        // score subió pero reward 0 → solo update
        await strapi.entityService.update('api::tarea.tarea', tarea.id, { data: updateData });
      }
    } else {
      // No hay repago: solo update
      await strapi.entityService.update('api::tarea.tarea', tarea.id, { data: updateData });
    }

    // 7. Respuesta
    ctx.body = {
      data: {
        tareaId: Number(tareaId),
        apelacionId,
        decision,
        scoreActual,
        score_final: nuevaApelacion.score_final,
        resuelta_por: nuevaApelacion.resuelta_por,
        fecha_resolucion: nuevaApelacion.fecha_resolucion,
        repago: repagoInfo,
      },
    };
  },
};

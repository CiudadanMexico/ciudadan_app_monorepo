'use strict';

/**
 * Apelar una calificación de tarea.
 *
 * Un socio puede apelar si:
 *   - La tarea está en estado 'calificada' o 'pagada'
 *   - El score de la tarea es menor o igual a un umbral (default 3)
 *   - No existe ya una apelación abierta (sin resolver) para la misma tarea
 *
 * Body:
 *   tareaId  — id de la tarea a apelar
 *   motivo   — texto explicando por qué apela (obligatorio, min 10 chars)
 *   scoreSolicitado — score que el socio considera justo (opcional, 1-5)
 *
 * Registra la apelación en el campo JSON `apelaciones` de la tarea con
 * estado 'abierta'. Un admin/socio puede luego revisarla y resolverla.
 *
 * Requiere Auth0 + rol admin o socio.
 */

const SCORE_UMBRAL_APELABLE = 3; // score <= 3 se puede apelar
const ESTADOS_APELABLES = ['calificada', 'pagada'];

module.exports = {
  async apelar(ctx) {
    const { tareaId, motivo, scoreSolicitado } = ctx.request.body;

    // --- 1. Validaciones de entrada ---
    if (!tareaId) {
      return ctx.badRequest('Falta el parámetro tareaId');
    }

    if (!motivo || String(motivo).trim().length < 10) {
      return ctx.badRequest('El motivo de la apelación debe tener al menos 10 caracteres');
    }

    if (scoreSolicitado !== undefined && scoreSolicitado !== null) {
      const s = Number(scoreSolicitado);
      if (isNaN(s) || s < 1 || s > 5) {
        return ctx.badRequest('scoreSolicitado debe ser un número entre 1 y 5');
      }
    }

    // --- 2. Verificar que la tarea existe ---
    const tarea = await strapi.entityService.findOne('api::tarea.tarea', tareaId, {
      fields: ['id', 'status', 'score', 'apelaciones', 'usuario'],
      populate: { usuario: true, reviewed_by: true },
    });

    if (!tarea) {
      return ctx.notFound('Tarea no encontrada');
    }

    // --- 2b. Validar que el solicitante es el dueño de la tarea ---
    // Spec documento-off.md: el socio que apela es el usuario que resolvió
    // la tarea (no cualquier socio/admin puede apelar tarea ajena).
    const solicitante = ctx.state.strapiUser;
    if (!solicitante) {
      return ctx.unauthorized('No autenticado');
    }
    const tareaUsuarioId = tarea.usuario?.id ?? tarea.usuario;
    if (tareaUsuarioId && Number(solicitante.id) !== Number(tareaUsuarioId)) {
      return ctx.forbidden(
        `Solo el dueño de la tarea puede apelar su calificación ` +
        `(solicitante=${solicitante.id}, dueño=${tareaUsuarioId})`
      );
    }

    // --- 3. Validar estado de la tarea ---
    if (!ESTADOS_APELABLES.includes(tarea.status)) {
      return ctx.badRequest(
        `No se puede apelar una tarea en estado '${tarea.status}'. ` +
        `Estados apelables: ${ESTADOS_APELABLES.join(', ')}`
      );
    }

    // --- 4. Validar que el score sea apelable ---
    const scoreActual = Number(tarea.score ?? 0);
    if (scoreActual > SCORE_UMBRAL_APELABLE) {
      return ctx.badRequest(
        `El score actual (${scoreActual}) no es apelable. ` +
        `Solo se pueden apelar tareas con score <= ${SCORE_UMBRAL_APELABLE}`
      );
    }

    // --- 5. Validar que no haya una apelación abierta ---
    const apelacionesPrevias = Array.isArray(tarea.apelaciones) ? tarea.apelaciones : [];
    const apelacionAbierta = apelacionesPrevias.find(
      (a) => a.estado === 'abierta' || a.estado === 'en_revision'
    );

    if (apelacionAbierta) {
      return ctx.badRequest(
        `Ya existe una apelación abierta para esta tarea ` +
        `(creada el ${apelacionAbierta.fecha}). Debe resolverse antes de crear una nueva.`
      );
    }

    // --- 6. Crear la apelación ---
    const userEmail = ctx.state.strapiUser?.email || 'desconocido';
    const userId = ctx.state.strapiUser?.id;

    const nuevaApelacion = {
      id: `apel_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      estado: 'abierta',
      motivo: String(motivo).trim(),
      scoreActual,
      scoreSolicitado: scoreSolicitado !== undefined ? Number(scoreSolicitado) : null,
      creada_por: userEmail,
      creada_por_id: userId,
      fecha: new Date().toISOString(),
      resuelta_por: null,
      fecha_resolucion: null,
      score_final: null,
      notas_resolucion: null,
    };

    await strapi.entityService.update('api::tarea.tarea', tareaId, {
      data: {
        apelaciones: [...apelacionesPrevias, nuevaApelacion],
      },
    });

    ctx.body = {
      data: {
        tareaId: Number(tareaId),
        apelacion: nuevaApelacion,
      },
      meta: {
        totalApelaciones: apelacionesPrevias.length + 1,
      },
    };
  },
};

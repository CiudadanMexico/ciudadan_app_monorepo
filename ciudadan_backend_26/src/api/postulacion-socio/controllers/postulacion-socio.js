'use strict';

/**
 * postulacion-socio controller
 *
 * - `create` (público, auth:false): el formulario de /candidatos lo llena
 *   gente sin cuenta; el core controller valida y persiste.
 * - `miAgencia` (admin/socio/root): lista las postulaciones de la agencia
 *   del usuario autenticado. `root` ve todas (bypass server-side).
 * - `resolver` (admin/socio/root): cambia el estado de una postulación
 *   (revisada/contactada/aceptada/rechazada) + notas + auditoría.
 */

const { createCoreController } = require('@strapi/strapi').factories;

const ESTADOS_VALIDOS = ['pendiente', 'revisada', 'contactada', 'aceptada', 'rechazada'];

module.exports = createCoreController('api::postulacion-socio.postulacion-socio', ({ strapi }) => ({
  /**
   * GET /api/postulacion-socios/mi-agencia
   * La policy is-admin-socio-or-root ya validó el token y dejó
   * ctx.state.strapiUser con su agencia populada.
   */
  async miAgencia(ctx) {
    const caller = ctx.state.strapiUser;
    const extra = Array.isArray(caller.roles?.extra) ? caller.roles.extra : [];
    const esRoot = extra.includes('root');

    // Sin agencia y sin root: no hay nada que mostrar.
    const agenciaId = caller.agencia?.id || null;
    if (!esRoot && !agenciaId) {
      ctx.body = { ok: true, data: [], agencia: null };
      return;
    }

    const where = esRoot ? {} : { agencia: agenciaId };

    const rows = await strapi.entityService.findMany('api::postulacion-socio.postulacion-socio', {
      filters: where,
      populate: { area: true, agencia: true, cv: true, revisado_por: { fields: ['id', 'email'] } },
      sort: { fecha_solicitud: 'desc' },
      limit: 500,
    });

    ctx.body = {
      ok: true,
      agencia: esRoot
        ? { id: null, nombre: 'Todas (root)' }
        : { id: caller.agencia.id, nombre: caller.agencia.nombre },
      esRoot,
      data: rows,
    };
  },

  /**
   * PATCH /api/postulacion-socios/:id/estado
   * Body: { estado, notas? }. Solo la propia agencia (o root). Registra
   * revisado_por + fecha_resolucion.
   */
  async resolver(ctx) {
    const caller = ctx.state.strapiUser;
    const extra = Array.isArray(caller.roles?.extra) ? caller.roles.extra : [];
    const esRoot = extra.includes('root');
    const { id } = ctx.params;
    const { estado, notas } = ctx.request.body || {};

    if (!ESTADOS_VALIDOS.includes(estado)) {
      return ctx.badRequest(`Estado inválido. Usa uno de: ${ESTADOS_VALIDOS.join(', ')}.`);
    }

    const postulacion = await strapi.entityService.findOne('api::postulacion-socio.postulacion-socio', id, {
      populate: { agencia: true },
    });
    if (!postulacion) return ctx.notFound('Postulación no encontrada.');

    // Autorización por agencia: admin/socio solo su propia agencia.
    if (!esRoot) {
      const agenciaCaller = caller.agencia?.id || null;
      const agenciaPost = postulacion.agencia?.id || null;
      if (!agenciaCaller || agenciaCaller !== agenciaPost) {
        return ctx.forbidden('No puedes gestionar postulaciones de otra agencia.');
      }
    }

    const data = {
      estado,
      revisado_por: caller.id,
      fecha_resolucion: new Date().toISOString(),
    };
    if (typeof notas === 'string') data.notas = notas.slice(0, 4000);

    const updated = await strapi.entityService.update('api::postulacion-socio.postulacion-socio', id, { data });

    ctx.body = { ok: true, data: updated };
  },
}));


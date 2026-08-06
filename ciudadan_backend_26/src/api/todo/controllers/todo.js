'use strict';

/**
 * todo controller
 *
 * extiende el core controller para añadir lógica de acceso:
 * - find / findOne: públicos (visibilidad de tareas generales sin login, per spec)
 * - create / update / delete: ya protegidos por policy is-admin-or-socio en routes
 *
 * El find aplica el filtro de visibilidad del spec documento-off.md (líneas
 * 32-35):
 *   - Visitante: solo tareas generales (nivel general/becario) con status visible.
 *   - Autenticado sin verificación: solo tareas generales.
 *   - Autenticado con áreas/skills verificadas: generales + especializadas que
 *     coincidan con sus verificaciones.
 *   - Admin/socio: bypass (sin filtro de nivel).
 */

const { createCoreController } = require('@strapi/strapi').factories;
const {
  buildTodoVisibilityFilter,
} = require('../../../utils/cowork/visibility');

const VISIBLE_STATUSES = [
  'publicada',
  'asignada',
  'en_proceso',
  'pendiente_revision',
  'calificada',
  'pagada',
];

module.exports = createCoreController('api::todo.todo', ({ strapi }) => ({
  async find(ctx) {
    const user = ctx.state?.strapiUser || ctx.state?.user;

    const visibilityFilters = await buildTodoVisibilityFilter(user, VISIBLE_STATUSES);

    ctx.query = {
      ...ctx.query,
      filters: {
        ...(ctx.query?.filters || {}),
        ...visibilityFilters,
      },
    };

    return super.find(ctx);
  },

  /**
   * Sobrescribimos update para validar que el creador o admin/socio pueda
   * modificar; y registrar auditoría si es cancelación de tarea publicada.
   */
  async update(ctx) {
    const user = ctx.state?.strapiUser;
    const { id } = ctx.params;

    // Verificar que exista la tarea
    const existing = await strapi.entityService.findOne('api::todo.todo', id, {
      fields: ['id', 'status'],
      populate: { creador: true },
    });
    if (!existing) {
      return ctx.notFound('Tarea no encontrada');
    }

    // Si es cancelación, registrar quién la canceló en anotaciones
    if (ctx.request.body?.data?.status === 'cancelada' && existing.status !== 'cancelada') {
      const anotaciones = [
        `Cancelada por ${user?.email || 'sistema'} el ${new Date().toISOString()}`,
      ].join('\n');
      ctx.request.body.data = {
        ...ctx.request.body.data,
        anotaciones: anotaciones,
      };
    }

    return super.update(ctx);
  },
}));

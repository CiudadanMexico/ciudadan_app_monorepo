'use strict';

/**
 * commission-payment controller
 *
 * Endpoints para gestión de comisiones:
 * - GET /api/commission-payments/me/pending : Mis comisiones pendientes
 * - GET /api/commission-payments/me/paid    : Mis comisiones pagadas
 * - POST /api/commission-payments/admin/mark-paid : Marcar como pagadas (admin)
 * - GET /api/commission-payments/admin/summary : Resumen por tipo (admin)
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::commission-payment.commission-payment', ({ strapi }) => ({

  /**
   * GET /api/commission-payments/me/pending
   * Comisiones pendientes del usuario autenticado
   */
  async myPending(ctx) {
    const user = ctx.state.strapiUser || ctx.state.user;
    if (!user) {
      return ctx.throw(401, 'Usuario no autenticado');
    }

    try {
      const service = strapi.service('api::commission-payment.commission-payment');
      const commissions = await service.getPendingCommissions(user.id);

      ctx.body = { data: commissions };
    } catch (err) {
      strapi.log.error('Error obteniendo comisiones pendientes:', err);
      ctx.throw(500, 'Error obteniendo comisiones');
    }
  },

  /**
   * GET /api/commission-payments/me/paid
   * Comisiones pagadas del usuario autenticado
   */
  async myPaid(ctx) {
    const user = ctx.state.strapiUser || ctx.state.user;
    if (!user) {
      return ctx.throw(401, 'Usuario no autenticado');
    }

    const { limit } = ctx.query;

    try {
      const service = strapi.service('api::commission-payment.commission-payment');
      const commissions = await service.getPaidCommissions(user.id, limit ? parseInt(limit) : 20);

      ctx.body = { data: commissions };
    } catch (err) {
      strapi.log.error('Error obteniendo comisiones pagadas:', err);
      ctx.throw(500, 'Error obteniendo comisiones');
    }
  },

  /**
   * POST /api/commission-payments/admin/mark-paid
   * Marcar comisiones como pagadas (solo admin)
   * Body: { commissionIds: [], paymentReference: '' }
   */
  async markPaid(ctx) {
    const user = ctx.state.strapiUser || ctx.state.user;
    if (!user || !['admin', 'superadmin'].includes(user.role || user.custom_data?.role || user.app_metadata?.role)) {
      return ctx.throw(403, 'Solo administradores pueden marcar comisiones como pagadas');
    }

    const { commissionIds, paymentReference } = ctx.request.body || {};

    if (!commissionIds || !Array.isArray(commissionIds) || commissionIds.length === 0) {
      return ctx.throw(400, 'commissionIds (array) requerido');
    }

    try {
      const service = strapi.service('api::commission-payment.commission-payment');
      const updated = await service.markAsPaid(commissionIds, paymentReference || 'manual');

      ctx.body = { data: updated };
    } catch (err) {
      strapi.log.error('Error marcando comisiones como pagadas:', err);
      ctx.throw(500, 'Error procesando pago');
    }
  },

  /**
   * GET /api/commission-payments/admin/summary
   * Resumen de comisiones por tipo (admin)
   */
  async summary(ctx) {
    const user = ctx.state.strapiUser || ctx.state.user;
    if (!user || !['admin', 'superadmin'].includes(user.role || user.custom_data?.role || user.app_metadata?.role)) {
      return ctx.throw(403, 'Solo administradores pueden ver el resumen');
    }

    try {
      const service = strapi.service('api::commission-payment.commission-payment');

      const leaderSummary = await service.getCommissionSummary('leader');
      const statePartnerSummary = await service.getCommissionSummary('state_partner');

      ctx.body = {
        data: {
          leaders: leaderSummary,
          state_partners: statePartnerSummary,
        },
      };
    } catch (err) {
      strapi.log.error('Error obteniendo resumen de comisiones:', err);
      ctx.throw(500, 'Error obteniendo resumen');
    }
  },

}));
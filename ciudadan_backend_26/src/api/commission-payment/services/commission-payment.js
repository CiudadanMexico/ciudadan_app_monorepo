'use strict';

/**
 * commission-payment service
 *
 * Gestiona el registro y pago de comisiones para:
 * - Líderes Verificadores (10% sobre membresías de conductores referidos)
 * - Socios Estatales (5% sobre membresías en su estado)
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::commission-payment.commission-payment', ({ strapi }) => ({

  /**
   * Registra una comisión (llamado desde driver-membership, leader, state-partner)
   */
  async recordCommission({ membershipId, recipientType, recipientId, amount, percentage, concept }) {
    try {
      const commission = await strapi.entityService.create('api::commission-payment.commission-payment', {
        data: {
          membership: membershipId,
          recipient_type: recipientType,
          recipient: recipientId,
          amount_mxn: amount,
          percentage,
          concept,
          status: 'pending',
          publishedAt: new Date().toISOString(),
        },
      });
      return commission;
    } catch (err) {
      strapi.log.error('Error registrando comisión:', err);
      throw err;
    }
  },

  /**
   * Obtiene comisiones pendientes de un usuario
   */
  async getPendingCommissions(userId) {
    return strapi.entityService.findMany('api::commission-payment.commission-payment', {
      filters: {
        recipient: userId,
        status: 'pending',
      },
      sort: ['createdAt:desc'],
      populate: ['membership', 'membership.driver'],
    });
  },

  /**
   * Obtiene comisiones pagadas de un usuario
   */
  async getPaidCommissions(userId, limit = 20) {
    return strapi.entityService.findMany('api::commission-payment.commission-payment', {
      filters: {
        recipient: userId,
        status: 'paid',
      },
      sort: ['paid_at:desc'],
      limit,
      populate: ['membership'],
    });
  },

  /**
   * Marca comisiones como pagadas (batch)
   */
  async markAsPaid(commissionIds, paymentReference) {
    const commissions = await strapi.entityService.findMany('api::commission-payment.commission-payment', {
      filters: { id: { $in: commissionIds } },
    });

    const results = [];
    for (const commission of commissions) {
      const updated = await strapi.entityService.update('api::commission-payment.commission-payment', commission.id, {
        data: {
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_reference: paymentReference,
          publishedAt: new Date().toISOString(),
        },
      });
      results.push(updated);
    }
    return results;
  },

  /**
   * Obtiene resumen de comisiones por tipo de destinatario
   */
  async getCommissionSummary(recipientType) {
    const pending = await strapi.entityService.findMany('api::commission-payment.commission-payment', {
      filters: { recipient_type: recipientType, status: 'pending' },
      fields: ['amount_mxn'],
    });

    const paid = await strapi.entityService.findMany('api::commission-payment.commission-payment', {
      filters: { recipient_type: recipientType, status: 'paid' },
      fields: ['amount_mxn'],
    });

    const totalPending = pending.reduce((sum, c) => sum + Number(c.amount_mxn), 0);
    const totalPaid = paid.reduce((sum, c) => sum + Number(c.amount_mxn), 0);

    return {
      totalPending,
      totalPaid,
      pendingCount: pending.length,
      paidCount: paid.length,
    };
  },

}));
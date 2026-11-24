'use strict';

/**
 * state-partner service
 *
 * Gestiona el programa de Socios Estatales:
 * - 5% comisión sobre membresías de conductores en su estado
 * - Cuota de ingreso $10,000 - $20,000 MXN (hasta 12 MSI)
 * - Un solo socio por estado
 * - Dashboard por estado
 */

const { createCoreService } = require('@strapi/strapi').factories;
const crypto = require('crypto');

module.exports = createCoreService('api::state-partner.state-partner', ({ strapi }) => ({

  /**
   * Genera un ID de idempotencia determinista
   * Sin timestamp: misma transacción + operación = misma clave
   */
  generateIdempotencyKey(partnerId, operation, referenceId) {
    const hash = crypto.createHash('sha256')
      .update(`${partnerId}:${operation}:${referenceId}`)
      .digest('hex')
      .slice(0, 16);
    return `idem_${partnerId}_${operation}_${hash}`;
  },

  /**
   * Verifica y registra idempotencia con estados (processing/completed/failed)
   * @returns {Object} { isFirst: boolean, record: Object|null }
   */
  async checkAndRecordIdempotency(idempotencyKey, operationType) {
    const existing = await strapi.entityService.findMany('api::idempotency-key.idempotency-key', {
      filters: { key: idempotencyKey },
      limit: 1,
    });

    if (existing.length > 0) {
      const record = existing[0];
      if (record.status === 'completed') {
        strapi.log.info(`Operación ya completada (idempotente): ${idempotencyKey} (${operationType})`);
        return { isFirst: false, record };
      }
      if (record.status === 'processing') {
        strapi.log.warn(`Operación en curso: ${idempotencyKey} (${operationType})`);
        return { isFirst: false, record };
      }
      await strapi.entityService.update('api::idempotency-key.idempotency-key', record.id, {
        data: {
          status: 'processing',
          error_message: null,
          processed_at: new Date().toISOString(),
          publishedAt: new Date().toISOString(),
        },
      });
      return { isFirst: true, record: { ...record, status: 'processing' } };
    }

    try {
      const record = await strapi.entityService.create('api::idempotency-key.idempotency-key', {
        data: {
          key: idempotencyKey,
          operation_type: operationType,
          status: 'processing',
          processed_at: new Date().toISOString(),
          publishedAt: new Date().toISOString(),
        },
      });
      return { isFirst: true, record };
    } catch (err) {
      if (err.message?.includes('duplicate') || err.message?.includes('unique') || err.code === '23505') {
        const existing2 = await strapi.entityService.findMany('api::idempotency-key.idempotency-key', {
          filters: { key: idempotencyKey },
          limit: 1,
        });
        if (existing2.length > 0 && existing2[0].status === 'completed') {
          return { isFirst: false, record: existing2[0] };
        }
        return { isFirst: true, record: existing2[0] };
      }
      throw err;
    }
  },

  async markIdempotencyCompleted(idempotencyKey, metadata = {}) {
    const existing = await strapi.entityService.findMany('api::idempotency-key.idempotency-key', {
      filters: { key: idempotencyKey },
      limit: 1,
    });
    if (existing.length > 0) {
      await strapi.entityService.update('api::idempotency-key.idempotency-key', existing[0].id, {
        data: {
          status: 'completed',
          completed_at: new Date().toISOString(),
          metadata,
          publishedAt: new Date().toISOString(),
        },
      });
    }
  },

  async markIdempotencyFailed(idempotencyKey, errorMessage) {
    const existing = await strapi.entityService.findMany('api::idempotency-key.idempotency-key', {
      filters: { key: idempotencyKey },
      limit: 1,
    });
    if (existing.length > 0) {
      await strapi.entityService.update('api::idempotency-key.idempotency-key', existing[0].id, {
        data: {
          status: 'failed',
          error_message: errorMessage,
          publishedAt: new Date().toISOString(),
        },
      });
    }
  },

  /**
   * Valida que el socio estatal pertenezca al usuario autenticado
   * @returns {Object|null} El socio si pertenece al usuario, null si no
   */
  async authorizePartnerAccess(userId, partnerId) {
    const partner = await strapi.entityService.findOne('api::state-partner.state-partner', partnerId, {
      populate: ['user'],
    });
    if (!partner || partner.user?.id !== userId) {
      return null;
    }
    return partner;
  },

  /**
   * Obtiene la configuración desde site-setting
   */
  async getConfig() {
    const siteSetting = await strapi.entityService.findOne('api::site-setting.site-setting', 1, {
      fields: [
        'state_partner_entry_fee_min_mxn',
        'state_partner_entry_fee_max_mxn',
        'state_partner_max_msi_months',
        'taxi_free_trip_state_partner_commission_pct',
      ],
    });
    return {
      entryFeeMin: siteSetting?.state_partner_entry_fee_min_mxn ?? 10000,
      entryFeeMax: siteSetting?.state_partner_entry_fee_max_mxn ?? 20000,
      maxMsiMonths: siteSetting?.state_partner_max_msi_months ?? 12,
      commissionPct: siteSetting?.taxi_free_trip_state_partner_commission_pct ?? 5,
    };
  },

  /**
   * Verifica si un estado está disponible (no tiene socio activo)
   */
  async isStateAvailable(state) {
    const existing = await strapi.entityService.findMany('api::state-partner.state-partner', {
      filters: { state: state, status: { $in: ['active', 'pending_payment'] } },
      limit: 1,
    });
    return existing.length === 0;
  },

  /**
   * Postularse como Socio Estatal (con autorización)
   */
  async apply(userId, userData) {
    const config = await this.getConfig();
    const { state, entry_fee_mxn, entry_fee_msi_months, ...rest } = userData;

    // Validar estado disponible
    const available = await this.isStateAvailable(state);
    if (!available) {
      throw new Error(`El estado ${state} ya tiene un Socio Estatal activo o en proceso`);
    }

    // Validar cuota de ingreso
    if (entry_fee_mxn < config.entryFeeMin || entry_fee_mxn > config.entryFeeMax) {
      throw new Error(`Cuota de ingreso debe estar entre $${config.entryFeeMin} y $${config.entryFeeMax} MXN`);
    }

    // Validar MSI
    if (entry_fee_msi_months && entry_fee_msi_months > config.maxMsiMonths) {
      throw new Error(`Máximo ${config.maxMsiMonths} meses sin intereses`);
    }

    const partner = await strapi.entityService.create('api::state-partner.state-partner', {
      data: {
        user: userId,
        email: rest.email,
        phone: rest.phone,
        full_name: rest.full_name,
        company_name: rest.company_name,
        rfc: rest.rfc,
        state,
        status: 'pending_payment',
        entry_fee_mxn,
        entry_fee_msi_months: entry_fee_msi_months || 0,
        commission_pct: config.commissionPct,
        publishedAt: new Date().toISOString(),
      },
    });

    strapi.eventHub?.emit('state_partner_applied', {
      partnerId: partner.id,
      userId,
      state,
      entryFee: entry_fee_mxn,
      msiMonths: entry_fee_msi_months || 0,
    });

    return partner;
  },

  /**
   * Procesa pago de cuota de ingreso (con autorización e idempotencia)
   */
  async processEntryFeePayment(userId, partnerId, paymentData) {
    const partner = await this.authorizePartnerAccess(userId, partnerId);
    if (!partner) {
      throw new Error('No autorizado: el socio estatal no pertenece al usuario');
    }

    if (partner.status !== 'pending_payment') {
      throw new Error('La cuota ya fue procesada');
    }

    let idempotencyKey = null;
    if (paymentData.payment_id) {
      idempotencyKey = this.generateIdempotencyKey(partnerId, 'entry_fee', paymentData.payment_id);
      const { isFirst } = await this.checkAndRecordIdempotency(idempotencyKey, 'state_partner_entry_fee');
      if (!isFirst) {
        strapi.log.info(`Pago de cuota ya procesado (idempotente): partnerId=${partnerId}, paymentId=${paymentData.payment_id}`);
        return { ok: true, duplicate: true };
      }
    }

    try {
      // Verificar monto
      if (Number(paymentData.amount) !== Number(partner.entry_fee_mxn)) {
        throw new Error('Monto de pago no coincide con la cuota de ingreso');
      }

      await strapi.entityService.update('api::state-partner.state-partner', partnerId, {
        data: {
          status: 'active',
          entry_fee_paid_at: new Date().toISOString(),
          entry_fee_payment_method: paymentData.method || 'mercado_pago',
          mercado_pago_payment_id: paymentData.payment_id || null,
          activated_at: new Date().toISOString(),
          publishedAt: new Date().toISOString(),
        },
      });

      if (idempotencyKey) {
        await this.markIdempotencyCompleted(idempotencyKey, { partnerId, paymentId: paymentData.payment_id });
      }

      strapi.eventHub?.emit('state_partner_activated', {
        partnerId,
        state: partner.state,
        entryFee: partner.entry_fee_mxn,
      });

      return { success: true, message: 'Socio Estatal activado correctamente' };
    } catch (err) {
      if (idempotencyKey) {
        await this.markIdempotencyFailed(idempotencyKey, err.message);
      }
      throw err;
    }
  },

  /**
   * Actualiza contadores de conductores en el estado
   */
  async updateDriverCounts(state) {
    const partner = await strapi.entityService.findMany('api::state-partner.state-partner', {
      filters: { state, status: 'active' },
      limit: 1,
    });

    if (partner.length === 0) return;

    const drivers = await strapi.entityService.findMany('api::driver.driver', {
      filters: { state, membership: { status: { $in: ['active', 'pending'] } } },
    });

    const activeDrivers = drivers.filter(d => d.membership?.status === 'active').length;

    await strapi.entityService.update('api::state-partner.state-partner', partner[0].id, {
      data: {
        total_drivers_in_state: drivers.length,
        active_drivers_in_state: activeDrivers,
        publishedAt: new Date().toISOString(),
      },
    });
  },

  /**
   * Obtiene dashboard del Socio Estatal (con autorización)
   */
  async getDashboard(userId, partnerId) {
    const partner = await this.authorizePartnerAccess(userId, partnerId);
    if (!partner) return null;

    const config = await this.getConfig();

    const pendingCommissions = await strapi.entityService.findMany('api::commission-payment.commission-payment', {
      filters: { recipient_type: 'state_partner', recipient: partner.user?.id, status: 'pending' },
      sort: ['createdAt:desc'],
    });

    const paidCommissions = await strapi.entityService.findMany('api::commission-payment.commission-payment', {
      filters: { recipient_type: 'state_partner', recipient: partner.user?.id, status: 'paid' },
      sort: ['createdAt:desc'],
      limit: 20,
    });

    const drivers = await strapi.entityService.findMany('api::driver.driver', {
      filters: { state: partner.state, membership: { status: { $in: ['active', 'pending'] } } },
      populate: ['membership', 'user', 'membership.referred_by_leader'],
      sort: ['createdAt:desc'],
      limit: 50,
    });

    const leaders = await strapi.entityService.findMany('api::leader.leader', {
      filters: { state: partner.state, status: 'active' },
      sort: ['createdAt:desc'],
    });

    return {
      partner: {
        id: partner.id,
        full_name: partner.full_name,
        email: partner.email,
        company_name: partner.company_name,
        state: partner.state,
        status: partner.status,
        entry_fee_mxn: partner.entry_fee_mxn,
        entry_fee_paid_at: partner.entry_fee_paid_at,
        commission_pct: partner.commission_pct,
      },
      stats: {
        total_drivers: partner.total_drivers_in_state,
        active_drivers: partner.active_drivers_in_state,
        total_leaders: leaders.length,
        total_earned: partner.total_commissions_earned,
        pending_commissions: partner.pending_commissions,
        paid_commissions: partner.paid_commissions,
      },
      commissions: {
        pending: pendingCommissions,
        recent_paid: paidCommissions,
      },
      drivers: drivers.map(d => ({
        id: d.id,
        full_name: `${d.firstname} ${d.lastname}`,
        email: d.email,
        status: d.membership?.status,
        plan: d.membership?.plan,
        referred_by_leader: d.membership?.referred_by_leader ? {
          id: d.membership.referred_by_leader.id,
          full_name: d.membership.referred_by_leader.full_name,
        } : null,
        created_at: d.createdAt,
      })),
      leaders: leaders.map(l => ({
        id: l.id,
        full_name: l.full_name,
        city: l.city,
        total_referred: l.total_referred_drivers,
        active_referred: l.active_referred_drivers,
      })),
      config: {
        entry_fee_min: config.entryFeeMin,
        entry_fee_max: config.entryFeeMax,
        max_msi_months: config.maxMsiMonths,
        commission_pct: config.commissionPct,
      },
    };
  },

  /**
   * Obtiene Socio Estatal por estado (público)
   */
  async getByState(state) {
    const partners = await strapi.entityService.findMany('api::state-partner.state-partner', {
      filters: { state, status: 'active' },
      limit: 1,
    });
    return partners[0] || null;
  },

}));
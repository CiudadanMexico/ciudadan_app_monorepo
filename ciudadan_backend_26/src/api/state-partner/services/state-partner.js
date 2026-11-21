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

module.exports = createCoreService('api::state-partner.state-partner', ({ strapi }) => ({

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
   * Postularse como Socio Estatal
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
   * Procesa pago de cuota de ingreso
   */
  async processEntryFeePayment(partnerId, paymentData) {
    const partner = await strapi.entityService.findOne('api::state-partner.state-partner', partnerId);
    if (!partner) {
      throw new Error('Socio Estatal no encontrado');
    }

    if (partner.status !== 'pending_payment') {
      throw new Error('La cuota ya fue procesada');
    }

    // Verificar monto
    if (Number(paymentData.amount) !== Number(partner.entry_fee_mxn)) {
      throw new Error('Monto de pago no coincide con la cuota de ingreso');
    }

    await strapi.entityService.update('api::state-partner.state-partner', partnerId, {
      data: {
        status: 'active',
        entry_fee_paid_at: new Date().toISOString(),
        entry_fee_payment_method: paymentData.method || 'mercado_pago',
        activated_at: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
      },
    });

    strapi.eventHub?.emit('state_partner_activated', {
      partnerId,
      state: partner.state,
      entryFee: partner.entry_fee_mxn,
    });

    return { success: true, message: 'Socio Estatal activado correctamente' };
  },

  /**
   * Procesa comisión por membresía en el estado
   */
  async processMembershipCommission(partnerId, membershipId, amount) {
    const partner = await strapi.entityService.findOne('api::state-partner.state-partner', partnerId);
    if (!partner || partner.status !== 'active') return;

    const commission = (amount * (partner.commission_pct || 5)) / 100;

    const newPending = (partner.pending_commissions || 0) + commission;
    const newTotal = (partner.total_commissions_earned || 0) + commission;

    await strapi.entityService.update('api::state-partner.state-partner', partnerId, {
      data: {
        pending_commissions: newPending,
        total_commissions_earned: newTotal,
        publishedAt: new Date().toISOString(),
      },
    });

    // Registrar en commission-payment
    try {
      await strapi.entityService.create('api::commission-payment.commission-payment', {
        data: {
          membership: membershipId,
          recipient_type: 'state_partner',
          recipient: partner.user,
          amount_mxn: commission,
          percentage: partner.commission_pct,
          concept: 'driver_membership',
          status: 'pending',
          publishedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      strapi.log.warn('Error registrando comisión de socio estatal:', err.message);
    }

    strapi.eventHub?.emit('state_partner_commission_earned', {
      partnerId,
      membershipId,
      commission,
      totalEarned: newTotal,
    });
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
   * Obtiene dashboard del Socio Estatal
   */
  async getDashboard(partnerId) {
    const partner = await strapi.entityService.findOne('api::state-partner.state-partner', partnerId, {
      populate: ['user'],
    });
    if (!partner) return null;

    const config = await this.getConfig();

    // Comisiones
    const pendingCommissions = await strapi.entityService.findMany('api::commission-payment.commission-payment', {
      filters: { recipient_type: 'state_partner', recipient: partner.user?.id, status: 'pending' },
      sort: ['createdAt:desc'],
    });

    const paidCommissions = await strapi.entityService.findMany('api::commission-payment.commission-payment', {
      filters: { recipient_type: 'state_partner', recipient: partner.user?.id, status: 'paid' },
      sort: ['createdAt:desc'],
      limit: 20,
    });

    // Conductores en el estado
    const drivers = await strapi.entityService.findMany('api::driver.driver', {
      filters: { state: partner.state, membership: { status: { $in: ['active', 'pending'] } } },
      populate: ['membership', 'user', 'membership.referred_by_leader'],
      sort: ['createdAt:desc'],
      limit: 50,
    });

    // Líderes en el estado
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
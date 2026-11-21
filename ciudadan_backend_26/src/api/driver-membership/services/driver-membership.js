'use strict';

/**
 * driver-membership service
 *
 * Gestiona la membresía mensual de conductores ($500/$300 promo)
 * con 2 modalidades de activación:
 * - pay_now: paga hoy ($500 o $300 promo), 0 viajes gratis
 * - pay_later: paga en 1 mes ($500 o $300 promo), 5 viajes gratis + 100 tarjetas QR físicas
 *
 * Integración con Mercado Pago para pagos recurrentes
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::driver-membership.driver-membership', ({ strapi }) => ({

  /**
   * Obtiene la configuración de membresía desde site-setting
   */
  async getConfig() {
    const siteSetting = await strapi.entityService.findOne('api::site-setting.site-setting', 1, {
      fields: [
        'taxi_driver_free_trips_count',
        'taxi_free_trip_max_discount_mxn',
        'taxi_free_trip_qr_validity_days',
        'taxi_card_production_fee_mxn',
        'taxi_card_shipping_fee_mxn',
        'taxi_free_trip_leader_commission_pct',
        'taxi_free_trip_state_partner_commission_pct',
        'leader_card_kit_price_mxn',
        'state_partner_entry_fee_min_mxn',
        'state_partner_entry_fee_max_mxn',
        'state_partner_max_msi_months',
      ],
    });
    return {
      driverFreeTripsCount: siteSetting?.taxi_driver_free_trips_count ?? 5,
      maxDiscountMxn: siteSetting?.taxi_free_trip_max_discount_mxn ?? 100,
      qrValidityDays: siteSetting?.taxi_free_trip_qr_validity_days ?? 30,
      cardProductionFee: siteSetting?.taxi_card_production_fee_mxn ?? 5,
      cardShippingFee: siteSetting?.taxi_card_shipping_fee_mxn ?? 0,
      leaderCommissionPct: siteSetting?.taxi_free_trip_leader_commission_pct ?? 10,
      statePartnerCommissionPct: siteSetting?.taxi_free_trip_state_partner_commission_pct ?? 5,
      leaderCardKitPrice: siteSetting?.leader_card_kit_price_mxn ?? 500,
      statePartnerEntryFeeMin: siteSetting?.state_partner_entry_fee_min_mxn ?? 10000,
      statePartnerEntryFeeMax: siteSetting?.state_partner_entry_fee_max_mxn ?? 20000,
      statePartnerMaxMsi: siteSetting?.state_partner_max_msi_months ?? 12,
    };
  },

  /**
   * Calcula el precio de la membresía según plan y elegibilidad promo
   */
  calculatePrice(plan, isPromoEligible) {
    if (plan === 'promo' && isPromoEligible) {
      return 300;
    }
    return 500;
  },

  /**
   * Crea una nueva membresía para un conductor
   */
  async createMembership(driverId, userId, { plan, activationMode, isPromoEligible, promoSource, referredByLeaderId, statePartnerId }) {
    const config = await this.getConfig();
    const price = this.calculatePrice(plan, isPromoEligible);

    const now = new Date();
    let currentPeriodStart, currentPeriodEnd, nextPaymentDate, freeTripsGranted = 0, physicalCardsGranted = 0;

    if (activationMode === 'pay_now') {
      // Paga hoy: período empieza ahora, próxima pago en 1 mes
      currentPeriodStart = now;
      currentPeriodEnd = new Date(now);
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
      nextPaymentDate = new Date(currentPeriodEnd);
    } else {
      // pay_later: período empieza en 1 mes, primera cobro en 1 mes
      currentPeriodStart = new Date(now);
      currentPeriodStart.setMonth(currentPeriodStart.getMonth() + 1);
      currentPeriodEnd = new Date(currentPeriodStart);
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
      nextPaymentDate = new Date(currentPeriodStart);
      // Otorga 5 viajes gratis + 100 tarjetas QR
      freeTripsGranted = config.driverFreeTripsCount;
      physicalCardsGranted = 100;
    }

    // Calcular expiración promo (si aplica)
    let promoExpiresAt = null;
    if (plan === 'promo' && isPromoEligible) {
      promoExpiresAt = new Date(now);
      promoExpiresAt.setMonth(promoExpiresAt.getMonth() + 12); // Promo válida por 12 meses
    }

    const membership = await strapi.entityService.create('api::driver-membership.driver-membership', {
      data: {
        driver: driverId,
        user: userId,
        plan,
        activation_mode: activationMode,
        status: activationMode === 'pay_now' ? 'active' : 'pending',
        price_mxn: price,
        currency: 'MXN',
        billing_cycle: 'monthly',
        current_period_start: currentPeriodStart?.toISOString(),
        current_period_end: currentPeriodEnd?.toISOString(),
        next_payment_date: nextPaymentDate?.toISOString(),
        free_trips_granted: freeTripsGranted,
        physical_cards_granted: physicalCardsGranted,
        promo_expires_at: promoExpiresAt?.toISOString(),
        referred_by_leader: referredByLeaderId || null,
        state_partner: statePartnerId || null,
        publishedAt: new Date().toISOString(),
      },
    });

    // Si es pay_later, otorgar viajes gratis al conductor
    if (activationMode === 'pay_later' && freeTripsGranted > 0) {
      await this.grantFreeTripsToDriver(driverId, freeTripsGranted);
    }

    // Emitir evento para comisiones
    strapi.eventHub?.emit('driver_membership_created', {
      membershipId: membership.id,
      driverId,
      plan,
      activationMode,
      price,
      referredByLeaderId,
      statePartnerId,
    });

    return membership;
  },

  /**
   * Otorga viajes gratis al conductor (para modalidad pay_later)
   */
  async grantFreeTripsToDriver(driverId, count) {
    const driver = await strapi.entityService.findOne('api::driver.driver', driverId);
    if (driver) {
      const currentFreeTrips = driver.free_trips || 0;
      await strapi.entityService.update('api::driver.driver', driverId, {
        data: { free_trips: currentFreeTrips + count },
      });
    }
  },

  /**
   * Procesa pago exitoso de Mercado Pago
   */
  async handlePaymentSuccess(membershipId, paymentData) {
    const membership = await strapi.entityService.findOne('api::driver-membership.driver-membership', membershipId, {
      populate: ['driver', 'referred_by_leader', 'state_partner'],
    });

    if (!membership) {
      throw new Error('Membresía no encontrada');
    }

    const now = new Date();
    const nextPeriodStart = new Date(membership.current_period_end);
    const nextPeriodEnd = new Date(nextPeriodStart);
    nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

    const updateData = {
      status: 'active',
      last_payment_date: now.toISOString(),
      last_payment_amount: paymentData.amount,
      current_period_start: membership.current_period_end,
      current_period_end: nextPeriodEnd.toISOString(),
      next_payment_date: nextPeriodEnd.toISOString(),
      failed_payments_count: 0,
      publishedAt: new Date().toISOString(),
    };

    // Si era pay_later y primer pago, activar membresía
    if (membership.activation_mode === 'pay_later' && membership.status === 'pending') {
      updateData.status = 'active';
    }

    const updated = await strapi.entityService.update('api::driver-membership.driver-membership', membershipId, {
      data: updateData,
    });

    // Calcular y registrar comisiones
    await this.processCommissions(membership, paymentData.amount);

    // Emitir evento
    strapi.eventHub?.emit('driver_membership_payment_success', {
      membershipId,
      driverId: membership.driver?.id,
      amount: paymentData.amount,
      period: {
        start: membership.current_period_end,
        end: nextPeriodEnd.toISOString(),
      },
    });

    return updated;
  },

  /**
   * Procesa comisiones para líder y socio estatal
   */
  async processCommissions(membership, amount) {
    const config = await this.getConfig();

    // Comisión para Líder Verificador (10%)
    if (membership.referred_by_leader) {
      const leaderCommission = (amount * config.leaderCommissionPct) / 100;
      await this.recordCommission({
        membershipId: membership.id,
        recipientType: 'leader',
        recipientId: membership.referred_by_leader.id,
        amount: leaderCommission,
        percentage: config.leaderCommissionPct,
        concept: 'driver_membership',
      });
    }

    // Comisión para Socio Estatal (5%)
    if (membership.state_partner) {
      const stateCommission = (amount * config.statePartnerCommissionPct) / 100;
      await this.recordCommission({
        membershipId: membership.id,
        recipientType: 'state_partner',
        recipientId: membership.state_partner.id,
        amount: stateCommission,
        percentage: config.statePartnerCommissionPct,
        concept: 'driver_membership',
      });
    }
  },

  /**
   * Registra una comisión en la base de datos
   */
  async recordCommission({ membershipId, recipientType, recipientId, amount, percentage, concept }) {
    // Usar entityService para crear registro en commission-payment (crear content-type si no existe)
    try {
      await strapi.entityService.create('api::commission-payment.commission-payment', {
        data: {
          membership: membershipId,
          recipient_type: recipientType,
          recipient: recipientId,
          amount_mxn: amount,
          percentage,
          concept,
          status: 'pending',
          created_at: new Date().toISOString(),
          publishedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      // Si no existe el content-type, logear y continuar
      strapi.log.warn('No se pudo registrar comisión (content-type commission-payment no existe):', err.message);
    }
  },

  /**
   * Procesa pago fallido
   */
  async handlePaymentFailure(membershipId) {
    const membership = await strapi.entityService.findOne('api::driver-membership.driver-membership', membershipId);
    if (!membership) return;

    const failedCount = (membership.failed_payments_count || 0) + 1;
    let newStatus = membership.status;

    if (failedCount >= 3) {
      newStatus = 'cancelled';
    } else if (failedCount >= 1) {
      newStatus = 'past_due';
    }

    await strapi.entityService.update('api::driver-membership.driver-membership', membershipId, {
      data: {
        failed_payments_count: failedCount,
        last_failed_payment_at: new Date().toISOString(),
        status: newStatus,
        publishedAt: new Date().toISOString(),
      },
    });

    strapi.eventHub?.emit('driver_membership_payment_failed', {
      membershipId,
      driverId: membership.driver,
      failedCount,
      newStatus,
    });
  },

  /**
   * Cancela una membresía
   */
  async cancelMembership(membershipId, reason) {
    const membership = await strapi.entityService.findOne('api::driver-membership.driver-membership', membershipId);
    if (!membership) {
      throw new Error('Membresía no encontrada');
    }

    // Cancelar suscripción en Mercado Pago si existe
    if (membership.mercado_pago_preapproval_id) {
      await this.cancelMercadoPagoSubscription(membership.mercado_pago_preapproval_id);
    }

    await strapi.entityService.update('api::driver-membership.driver-membership', membershipId, {
      data: {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
        publishedAt: new Date().toISOString(),
      },
    });

    strapi.eventHub?.emit('driver_membership_cancelled', {
      membershipId,
      driverId: membership.driver,
      reason,
    });
  },

  /**
   * Cancela suscripción en Mercado Pago
   */
  async cancelMercadoPagoSubscription(preapprovalId) {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      strapi.log.warn('MERCADO_PAGO_ACCESS_TOKEN no configurado');
      return;
    }

    try {
      const response = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const text = await response.text();
        strapi.log.error('Error cancelando suscripción MP:', text);
      }
    } catch (err) {
      strapi.log.error('Error en cancelMercadoPagoSubscription:', err);
    }
  },

  /**
   * Obtiene la membresía activa de un conductor
   */
  async getActiveMembership(driverId) {
    const memberships = await strapi.entityService.findMany('api::driver-membership.driver-membership', {
      filters: {
        driver: driverId,
        status: { $in: ['active', 'pending', 'past_due'] },
      },
      sort: ['createdAt:desc'],
      limit: 1,
      populate: ['driver', 'referred_by_leader', 'state_partner'],
    });
    return memberships[0] || null;
  },

  /**
   * Verifica si un conductor tiene membresía activa
   */
  async hasActiveMembership(driverId) {
    const membership = await this.getActiveMembership(driverId);
    return membership && ['active', 'pending'].includes(membership.status);
  },

  /**
   * Crea preferencia de pago en Mercado Pago para membresía
   */
  async createMercadoPagoPreference(membershipId, payerEmail, backUrl) {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error('MERCADO_PAGO_ACCESS_TOKEN no configurado');
    }

    const membership = await strapi.entityService.findOne('api::driver-membership.driver-membership', membershipId, {
      populate: ['driver'],
    });

    if (!membership) {
      throw new Error('Membresía no encontrada');
    }

    const isFirstPayment = membership.activation_mode === 'pay_now' || membership.status === 'pending';

    const preferenceData = {
      items: [{
        id: membership.id,
        title: `Membresía Ciudadan Taxi - ${membership.plan === 'promo' ? 'Promo $300' : 'Normal $500'}`,
        description: `Membresía mensual para conductor${isFirstPayment ? ' (primer pago)' : ' (renovación)'}`,
        quantity: 1,
        unit_price: Number(membership.price_mxn),
        currency_id: 'MXN',
      }],
      payer: { email: payerEmail },
      back_urls: {
        success: `${backUrl}/membership/success`,
        failure: `${backUrl}/membership/failure`,
        pending: `${backUrl}/membership/pending`,
      },
      auto_return: 'approved',
      external_reference: membership.id,
      notification_url: `${process.env.STRAPI_URL}/api/driver-membership/webhook/mercadopago`,
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferenceData),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Error creando preferencia MP: ${text}`);
    }

    const preference = await response.json();
    return preference;
  },

  /**
   * Crea suscripción recurrente (preapproval) en Mercado Pago
   */
  async createMercadoPagoPreapproval(membershipId, payerEmail, cardToken) {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error('MERCADO_PAGO_ACCESS_TOKEN no configurado');
    }

    const membership = await strapi.entityService.findOne('api::driver-membership.driver-membership', membershipId, {
      populate: ['driver'],
    });

    if (!membership) {
      throw new Error('Membresía no encontrada');
    }

    const preapprovalData = {
      reason: `Membresía Ciudadan Taxi - ${membership.plan === 'promo' ? 'Promo $300' : 'Normal $500'}`,
      external_reference: membership.id,
      payer_email: payerEmail,
      card_token_id: cardToken,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: Number(membership.price_mxn),
        currency_id: 'MXN',
        start_date: membership.next_payment_date || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 año
      },
      back_url: `${process.env.FRONTEND_URL}/membership/success`,
      notification_url: `${process.env.STRAPI_URL}/api/driver-membership/webhook/mercadopago`,
    };

    const response = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preapprovalData),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Error creando preapproval MP: ${text}`);
    }

    const preapproval = await response.json();

    // Actualizar membresía con IDs de Mercado Pago
    await strapi.entityService.update('api::driver-membership.driver-membership', membershipId, {
      data: {
        mercado_pago_preapproval_id: preapproval.id,
        mercado_pago_customer_id: preapproval.payer_id,
        publishedAt: new Date().toISOString(),
      },
    });

    return preapproval;
  },

  /**
   * Webhook de Mercado Pago
   */
  async handleMercadoPagoWebhook(payload) {
    const { type, data } = payload;

    switch (type) {
      case 'payment':
        return this.handlePaymentWebhook(data.id);
      case 'preapproval':
        return this.handlePreapprovalWebhook(data.id);
      default:
        strapi.log.info(`Webhook MP no manejado: ${type}`);
        return { ok: true };
    }
  },

  async handlePaymentWebhook(paymentId) {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) return { ok: false };

    const payment = await response.json();
    const membershipId = payment.external_reference;

    if (payment.status === 'approved') {
      await this.handlePaymentSuccess(membershipId, {
        amount: payment.transaction_amount,
        paymentId: payment.id,
      });
    } else if (['rejected', 'cancelled'].includes(payment.status)) {
      await this.handlePaymentFailure(membershipId);
    }

    return { ok: true };
  },

  async handlePreapprovalWebhook(preapprovalId) {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const response = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) return { ok: false };

    const preapproval = await response.json();
    const membershipId = preapproval.external_reference;

    // Actualizar estado de la preapproval
    const membership = await strapi.entityService.findOne('api::driver-membership.driver-membership', membershipId);
    if (membership) {
      await strapi.entityService.update('api::driver-membership.driver-membership', membershipId, {
        data: {
          mercado_pago_subscription_id: preapproval.id,
          publishedAt: new Date().toISOString(),
        },
      });
    }

    return { ok: true };
  },

}));
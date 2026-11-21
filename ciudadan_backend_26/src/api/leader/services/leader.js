'use strict';

/**
 * leader service
 *
 * Gestiona el programa de Líderes Verificadores:
 * - 10% comisión sobre membresías de conductores referidos
 * - Kit de 5000 tarjetas físicas por $500 MXN + envío (Skydropx)
 * - QR personalizado para registro de conductores
 * - Período de prueba: 15 días para incorporar 10 conductores
 */

const { createCoreService } = require('@strapi/strapi').factories;
const crypto = require('crypto');

module.exports = createCoreService('api::leader.leader', ({ strapi }) => ({

  /**
   * Obtiene la configuración desde site-setting
   */
  async getConfig() {
    const siteSetting = await strapi.entityService.findOne('api::site-setting.site-setting', 1, {
      fields: [
        'driver_verifier_testing_days',
        'driver_verifier_required_referrals',
        'verifier_candidates_whatsapp_group_url',
        'taxi_free_trip_leader_commission_pct',
        'leader_card_kit_price_mxn',
        'taxi_card_production_fee_mxn',
        'taxi_card_shipping_fee_mxn',
      ],
    });
    return {
      testingDays: siteSetting?.driver_verifier_testing_days ?? 15,
      requiredReferrals: siteSetting?.driver_verifier_required_referrals ?? 10,
      whatsappGroupUrl: siteSetting?.verifier_candidates_whatsapp_group_url || '',
      commissionPct: siteSetting?.taxi_free_trip_leader_commission_pct ?? 10,
      kitPrice: siteSetting?.leader_card_kit_price_mxn ?? 500,
      cardProductionFee: siteSetting?.taxi_card_production_fee_mxn ?? 5,
      cardShippingFee: siteSetting?.taxi_card_shipping_fee_mxn ?? 0,
    };
  },

  /**
   * Genera un código de referido único
   */
  generateReferralCode() {
    const prefix = 'LID';
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}${random}`;
  },

  /**
   * Genera QR personalizado para el líder
   */
  generateLeaderQR(leaderId, referralCode) {
    const baseUrl = process.env.FRONTEND_URL || 'https://taxis.ciudadan.org';
    return `${baseUrl}/registro/conductor?ref=${referralCode}&leader=${leaderId}`;
  },

  /**
   * Crea un candidato a Líder Verificador
   */
  async createCandidate(userId, userData) {
    const config = await this.getConfig();
    const referralCode = this.generateReferralCode();
    const qrCode = this.generateLeaderQR(null, referralCode); // leaderId se actualiza después

    const candidate = await strapi.entityService.create('api::leader.leader', {
      data: {
        user: userId,
        email: userData.email,
        phone: userData.phone,
        full_name: userData.full_name,
        state: userData.state,
        city: userData.city,
        status: 'candidate',
        referral_code: referralCode,
        qr_code: qrCode,
        testing_started_at: new Date().toISOString(),
        testing_ends_at: new Date(Date.now() + config.testingDays * 24 * 60 * 60 * 1000).toISOString(),
        publishedAt: new Date().toISOString(),
      },
    });

    // Actualizar QR con el ID real
    const finalQR = this.generateLeaderQR(candidate.id, referralCode);
    await strapi.entityService.update('api::leader.leader', candidate.id, {
      data: { qr_code: finalQR },
    });

    // Generar imagen QR
    const qrImageUrl = await this.generateQRImage(finalQR);
    if (qrImageUrl) {
      await strapi.entityService.update('api::leader.leader', candidate.id, {
        data: { qr_image: qrImageUrl },
      });
    }

    // Emitir evento
    strapi.eventHub?.emit('leader_candidate_created', {
      leaderId: candidate.id,
      userId,
      referralCode,
      testingEndsAt: candidate.testing_ends_at,
    });

    return candidate;
  },

  /**
   * Genera imagen QR usando API externa
   */
  async generateQRImage(qrData) {
    try {
      // Usar API de QR code (goqr.me o similar)
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
      return qrUrl;
    } catch (err) {
      strapi.log.warn('Error generando QR:', err);
      return null;
    }
  },

  /**
   * Verifica si el candidato cumplió los requisitos para activarse
   */
  async checkCandidateProgress(leaderId) {
    const leader = await strapi.entityService.findOne('api::leader.leader', leaderId);
    if (!leader || leader.status !== 'candidate') return { eligible: false };

    const config = await this.getConfig();
    const now = new Date();
    const testingEnds = new Date(leader.testing_ends_at);

    const hasTime = now <= testingEnds;
    const hasReferrals = leader.total_referred_drivers >= config.requiredReferrals;

    return {
      eligible: hasTime && hasReferrals,
      hasTime,
      hasReferrals,
      daysRemaining: Math.max(0, Math.ceil((testingEnds - now) / (1000 * 60 * 60 * 24))),
      referralsNeeded: Math.max(0, config.requiredReferrals - leader.total_referred_drivers),
      testingEndsAt: leader.testing_ends_at,
    };
  },

  /**
   * Activa a un Líder Verificador (después de pasar la prueba)
   */
  async activateLeader(leaderId) {
    const progress = await this.checkCandidateProgress(leaderId);
    if (!progress.eligible) {
      throw new Error('El candidato no cumple los requisitos para activarse');
    }

    const leader = await strapi.entityService.update('api::leader.leader', leaderId, {
      data: {
        status: 'active',
        activated_at: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
      },
    });

    strapi.eventHub?.emit('leader_activated', {
      leaderId,
      totalReferred: leader.total_referred_drivers,
    });

    return leader;
  },

  /**
   * Registra un conductor referido por el líder
   */
  async registerReferredDriver(leaderId, driverId, membershipActivated = false) {
    const leader = await strapi.entityService.findOne('api::leader.leader', leaderId);
    if (!leader) return;

    const newTotal = (leader.total_referred_drivers || 0) + 1;
    const newActive = membershipActivated ? (leader.active_referred_drivers || 0) + 1 : (leader.active_referred_drivers || 0);

    await strapi.entityService.update('api::leader.leader', leaderId, {
      data: {
        total_referred_drivers: newTotal,
        active_referred_drivers: newActive,
        publishedAt: new Date().toISOString(),
      },
    });

    // Si era candidato, verificar si ya puede activarse
    if (leader.status === 'candidate') {
      const progress = await this.checkCandidateProgress(leaderId);
      if (progress.eligible) {
        await this.activateLeader(leaderId);
      }
    }

    strapi.eventHub?.emit('leader_referred_driver', {
      leaderId,
      driverId,
      membershipActivated,
      totalReferred: newTotal,
      activeReferred: newActive,
    });
  },

  /**
   * Procesa comisión por membresía activada
   */
  async processMembershipCommission(leaderId, membershipId, amount) {
    const config = await this.getConfig();
    const commission = (amount * config.commissionPct) / 100;

    const leader = await strapi.entityService.findOne('api::leader.leader', leaderId);
    if (!leader) return;

    const newPending = (leader.pending_commissions || 0) + commission;
    const newTotal = (leader.total_commissions_earned || 0) + commission;

    await strapi.entityService.update('api::leader.leader', leaderId, {
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
          recipient_type: 'leader',
          recipient: leader.user,
          amount_mxn: commission,
          percentage: config.commissionPct,
          concept: 'driver_membership',
          status: 'pending',
          publishedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      strapi.log.warn('Error registrando comisión:', err.message);
    }

    strapi.eventHub?.emit('leader_commission_earned', {
      leaderId,
      membershipId,
      commission,
      totalEarned: newTotal,
    });
  },

  /**
   * Compra del kit de 5000 tarjetas
   * paymentData: { payment_id, amount, method }
   */
  async purchaseCardKit(leaderId, paymentData = {}) {
    const leader = await strapi.entityService.findOne('api::leader.leader', leaderId);
    if (!leader || leader.status !== 'active') {
      throw new Error('Solo líderes activos pueden comprar el kit');
    }
    if (leader.kit_purchased) {
      throw new Error('El kit ya fue comprado');
    }

    const config = await this.getConfig();

    // Crear envío via Skydropx
    const shippingData = await this.createSkydropxShipment({
      leader,
      items: [{ description: 'Kit 5000 tarjetas QR', quantity: 1, value: config.kitPrice }],
      shippingFee: config.cardShippingFee,
    });

    // Preparar datos de actualización
    const updateData = {
      kit_purchased: true,
      kit_purchase_date: new Date().toISOString(),
      kit_cards_received: 5000,
      publishedAt: new Date().toISOString(),
    };

    // Guardar info de Mercado Pago si viene en paymentData
    if (paymentData.payment_id) {
      updateData.mercado_pago_payment_id = paymentData.payment_id;
    }

    await strapi.entityService.update('api::leader.leader', leaderId, {
      data: updateData,
    });

    strapi.eventHub?.emit('leader_kit_purchased', {
      leaderId,
      kitPrice: config.kitPrice,
      shippingId: shippingData?.id,
      trackingNumber: shippingData?.tracking_number,
      paymentId: paymentData.payment_id,
      paymentMethod: paymentData.method,
    });

    return { success: true, shipping: shippingData };
  },

  /**
   * Crea envío en Skydropx
   */
  async createSkydropxShipment({ leader, items, shippingFee }) {
    const apiKey = process.env.SKYDROPX_API_KEY;
    if (!apiKey) {
      strapi.log.warn('SKYDROPX_API_KEY no configurado');
      return null;
    }

    const shipmentData = {
      shipment: {
        address: {
          street: leader.address || 'Por confirmar',
          number: leader.address_number || '1',
          colony: leader.colony || 'Centro',
          city: leader.city,
          state: leader.state,
          zip_code: leader.zip_code || '00000',
          country: 'MX',
        },
        parcel: {
          weight: 2,
          length: 30,
          width: 20,
          height: 10,
        },
        contents: items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          value: item.value,
        })),
        insurance_amount: config.kitPrice + shippingFee,
        reference: `leader-kit-${leader.id}-${Date.now()}`,
      },
    };

    try {
      const response = await fetch('https://api.skydropx.com/v1/shipments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shipmentData),
      });

      if (!response.ok) {
        const text = await response.text();
        strapi.log.error('Error creando envío Skydropx:', text);
        return null;
      }

      return await response.json();
    } catch (err) {
      strapi.log.error('Error en createSkydropxShipment:', err);
      return null;
    }
  },

  /**
   * Obtiene dashboard del líder
   */
  async getDashboard(leaderId) {
    const leader = await strapi.entityService.findOne('api::leader.leader', leaderId, {
      populate: ['user'],
    });
    if (!leader) return null;

    const config = await this.getConfig();

    // Comisiones pendientes y pagadas
    const pendingCommissions = await strapi.entityService.findMany('api::commission-payment.commission-payment', {
      filters: { recipient_type: 'leader', recipient: leader.user?.id, status: 'pending' },
      sort: ['createdAt:desc'],
    });

    const paidCommissions = await strapi.entityService.findMany('api::commission-payment.commission-payment', {
      filters: { recipient_type: 'leader', recipient: leader.user?.id, status: 'paid' },
      sort: ['createdAt:desc'],
      limit: 20,
    });

    // Conductores referidos recientes
    const referredDrivers = await strapi.entityService.findMany('api::driver.driver', {
      filters: { membership: { referred_by_leader: leaderId } },
      populate: ['membership', 'user'],
      sort: ['createdAt:desc'],
      limit: 20,
    });

    return {
      leader: {
        id: leader.id,
        full_name: leader.full_name,
        email: leader.email,
        status: leader.status,
        referral_code: leader.referral_code,
        qr_code: leader.qr_code,
        qr_image: leader.qr_image,
        whatsapp_group_url: config.whatsappGroupUrl,
      },
      stats: {
        total_referred: leader.total_referred_drivers,
        active_referred: leader.active_referred_drivers,
        total_earned: leader.total_commissions_earned,
        pending_commissions: leader.pending_commissions,
        paid_commissions: leader.paid_commissions,
      },
      commissions: {
        pending: pendingCommissions,
        recent_paid: paidCommissions,
      },
      referred_drivers: referredDrivers,
      kit: {
        purchased: leader.kit_purchased,
        purchase_date: leader.kit_purchase_date,
        cards_received: leader.kit_cards_received,
        cards_distributed: leader.cards_distributed,
        price: config.kitPrice,
        shipping_fee: config.cardShippingFee,
      },
      testing: leader.status === 'candidate' ? {
        days_remaining: Math.max(0, Math.ceil((new Date(leader.testing_ends_at) - new Date()) / (1000 * 60 * 60 * 24))),
        referrals_needed: Math.max(0, config.requiredReferrals - leader.total_referred_drivers),
        required: config.requiredReferrals,
        ends_at: leader.testing_ends_at,
      } : null,
    };
  },

}));
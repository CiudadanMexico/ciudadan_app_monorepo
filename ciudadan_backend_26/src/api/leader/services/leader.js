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
   * Genera un ID de idempotencia único
   */
  generateIdempotencyKey(leaderId, operation, referenceId) {
    const timestamp = Date.now().toString(36);
    const hash = crypto.createHash('sha256')
      .update(`${leaderId}:${operation}:${referenceId}:${timestamp}`)
      .digest('hex')
      .slice(0, 16);
    return `idem_${leaderId}_${operation}_${hash}`;
  },

  /**
   * Verifica y registra idempotencia
   * @returns {boolean} true si es la primera vez, false si ya se procesó
   */
  async checkAndRecordIdempotency(idempotencyKey, operationType) {
    try {
      await strapi.entityService.create('api::idempotency-key.idempotency-key', {
        data: {
          key: idempotencyKey,
          operation_type: operationType,
          processed_at: new Date().toISOString(),
          publishedAt: new Date().toISOString(),
        },
      });
      return true;
    } catch (err) {
      if (err.message?.includes('duplicate') || err.message?.includes('unique') || err.code === '23505') {
        strapi.log.warn(`Operación duplicada detectada: ${idempotencyKey} (${operationType})`);
        return false;
      }
      throw err;
    }
  },

  /**
   * Valida que el líder pertenezca al usuario autenticado
   * @returns {Object|null} El líder si pertenece al usuario, null si no
   */
  async authorizeLeaderAccess(userId, leaderId) {
    const leader = await strapi.entityService.findOne('api::leader.leader', leaderId, {
      populate: ['user'],
    });
    if (!leader || leader.user?.id !== userId) {
      return null;
    }
    return leader;
  },

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
    return `${baseUrl}/activatumembresia?ref=${referralCode}&leader=${leaderId}`;
  },

  /**
   * Crea un candidato a Líder Verificador (con autorización)
   */
  async createCandidate(userId, userData) {
    const config = await this.getConfig();
    const referralCode = this.generateReferralCode();
    const qrCode = this.generateLeaderQR(null, referralCode);

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

    const finalQR = this.generateLeaderQR(candidate.id, referralCode);
    await strapi.entityService.update('api::leader.leader', candidate.id, {
      data: { qr_code: finalQR },
    });

    const qrImageUrl = await this.generateQRImage(finalQR);
    if (qrImageUrl) {
      await strapi.entityService.update('api::leader.leader', candidate.id, {
        data: { qr_image: qrImageUrl },
      });
    }

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
   * Activa a un Líder Verificador (con autorización)
   */
  async activateLeader(userId, leaderId) {
    const leader = await this.authorizeLeaderAccess(userId, leaderId);
    if (!leader) {
      throw new Error('No autorizado: el líder no pertenece al usuario');
    }

    const progress = await this.checkCandidateProgress(leaderId);
    if (!progress.eligible) {
      throw new Error('El candidato no cumple los requisitos para activarse');
    }

    const updated = await strapi.entityService.update('api::leader.leader', leaderId, {
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

    return updated;
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

    if (leader.status === 'candidate') {
      const progress = await this.checkCandidateProgress(leaderId);
      if (progress.eligible) {
        await this.activateLeader(leader.user.id, leaderId);
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
   * Procesa comisión por membresía activada (con idempotencia)
   */
  async processMembershipCommission(leaderId, membershipId, amount) {
    // Idempotencia: usar membershipId como referencia
    const idempotencyKey = this.generateIdempotencyKey(leaderId, 'commission', membershipId);
    const isFirst = await this.checkAndRecordIdempotency(idempotencyKey, 'leader_commission');
    if (!isFirst) {
      strapi.log.info(`Comisión ya procesada (idempotente): leaderId=${leaderId}, membershipId=${membershipId}`);
      return { ok: true, duplicate: true };
    }

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
   * Compra del kit de 5000 tarjetas (con autorización e idempotencia)
   * Verifica el pago con Mercado Pago antes de confirmar
   */
  async purchaseCardKit(userId, leaderId, paymentData = {}) {
    const leader = await this.authorizeLeaderAccess(userId, leaderId);
    if (!leader) {
      throw new Error('No autorizado: el líder no pertenece al usuario');
    }
    if (leader.status !== 'active') {
      throw new Error('Solo líderes activos pueden comprar el kit');
    }
    if (leader.kit_purchased) {
      throw new Error('El kit ya fue comprado');
    }

    const config = await this.getConfig();
    const totalAmount = config.kitPrice + config.cardShippingFee;

    // Verificar pago con Mercado Pago si se proporciona payment_id
    let verifiedPayment = null;
    if (paymentData.payment_id) {
      // Idempotencia por payment_id
      const idempotencyKey = this.generateIdempotencyKey(leaderId, 'kit_purchase', paymentData.payment_id);
      const isFirst = await this.checkAndRecordIdempotency(idempotencyKey, 'leader_kit_purchase');
      if (!isFirst) {
        strapi.log.info(`Compra de kit ya procesada (idempotente): leaderId=${leaderId}, paymentId=${paymentData.payment_id}`);
        return { ok: true, duplicate: true };
      }

      // Verificar pago real con MP
      const mpService = strapi.service('api::mercado-pago.mercado-pago');
      const payment = await mpService.getPayment(paymentData.payment_id);
      if (!payment) {
        throw new Error('Pago no encontrado en Mercado Pago');
      }
      if (payment.status !== 'approved') {
        throw new Error(`Pago no aprobado: ${payment.status}`);
      }
      if (Number(payment.transaction_amount) !== Number(totalAmount)) {
        throw new Error(`Monto incorrecto: esperado ${totalAmount}, recibido ${payment.transaction_amount}`);
      }
      if (payment.external_reference !== leaderId) {
        throw new Error('Referencia externa no coincide con el líder');
      }
      if (payment.currency_id !== 'MXN') {
        throw new Error('Moneda incorrecta');
      }

      verifiedPayment = payment;
    } else {
      throw new Error('payment_id requerido para verificar la compra del kit');
    }

    // Crear envío via Skydropx
    const shippingData = await this.createSkydropxShipment({
      leader,
      items: [{ description: 'Kit 5000 tarjetas QR', quantity: 1, value: config.kitPrice }],
      shippingFee: config.cardShippingFee,
    });

    if (!shippingData) {
      strapi.log.warn('No se pudo crear envío Skydropx, pero el pago fue verificado');
    }

    const updateData = {
      kit_purchased: true,
      kit_purchase_date: new Date().toISOString(),
      kit_cards_received: 5000,
      mercado_pago_payment_id: verifiedPayment.id,
      publishedAt: new Date().toISOString(),
    };

    await strapi.entityService.update('api::leader.leader', leaderId, {
      data: updateData,
    });

    strapi.eventHub?.emit('leader_kit_purchased', {
      leaderId,
      kitPrice: config.kitPrice,
      shippingId: shippingData?.id,
      trackingNumber: shippingData?.tracking_number,
      paymentId: verifiedPayment.id,
      paymentMethod: verifiedPayment.payment_method_id,
      amount: verifiedPayment.transaction_amount,
    });

    return { success: true, shipping: shippingData, payment: verifiedPayment };
  },

  /**
   * Crea envío en Skydropx (fix: usar config correcto)
   */
  async createSkydropxShipment({ leader, items, shippingFee }) {
    const apiKey = process.env.SKYDROPX_API_KEY;
    if (!apiKey) {
      strapi.log.warn('SKYDROPX_API_KEY no configurado');
      return null;
    }

    const config = await this.getConfig(); // Fix: obtener config local

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
        insurance_amount: config.kitPrice + shippingFee, // Fix: usar config.kitPrice
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
   * Obtiene dashboard del líder (con autorización)
   */
  async getDashboard(userId, leaderId) {
    const leader = await this.authorizeLeaderAccess(userId, leaderId);
    if (!leader) return null;

    const config = await this.getConfig();

    const pendingCommissions = await strapi.entityService.findMany('api::commission-payment.commission-payment', {
      filters: { recipient_type: 'leader', recipient: leader.user?.id, status: 'pending' },
      sort: ['createdAt:desc'],
    });

    const paidCommissions = await strapi.entityService.findMany('api::commission-payment.commission-payment', {
      filters: { recipient_type: 'leader', recipient: leader.user?.id, status: 'paid' },
      sort: ['createdAt:desc'],
      limit: 20,
    });

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

  /**
   * Webhook de Mercado Pago para líder
   */
  async handleMercadoPagoWebhook(ctx, payload) {
    const mpService = strapi.service('api::mercado-pago.mercado-pago');
    const result = await mpService.handleWebhook(ctx, payload);

    if (!result.ok) {
      return result;
    }

    // Procesar según el tipo de evento validado
    switch (result.type) {
      case 'payment_approved':
        // Verificar si es compra de kit
        if (result.metadata?.purpose === 'leader_kit' || result.externalReference) {
          await this.handleKitPaymentSuccess(result.externalReference, {
            amount: result.amount,
            paymentId: result.paymentId,
            payerEmail: result.payerEmail,
            paymentMethod: result.paymentMethod,
            paymentType: result.paymentType,
          });
        }
        return { ok: true, processed: 'payment_approved', externalReference: result.externalReference };

      case 'payment_failed':
        if (result.metadata?.purpose === 'leader_kit') {
          await this.handleKitPaymentFailure(result.externalReference);
        }
        return { ok: true, processed: 'payment_failed', externalReference: result.externalReference, status: result.status };

      case 'payment_pending':
        strapi.log.info(`Pago pendiente kit líder: ${result.externalReference}, status: ${result.status}`);
        return { ok: true, processed: 'payment_pending', externalReference: result.externalReference, status: result.status };

      default:
        strapi.log.info(`Evento MP líder no procesado: ${result.type}`);
        return { ok: true, ignored: true };
    }
  },

  /**
   * Maneja pago exitoso de kit de líder
   */
  async handleKitPaymentSuccess(leaderId, paymentData) {
    const leader = await strapi.entityService.findOne('api::leader.leader', leaderId);
    if (!leader) {
      strapi.log.warn(`Líder no encontrado para kit payment: ${leaderId}`);
      return;
    }

    if (leader.kit_purchased) {
      strapi.log.info(`Kit ya comprado para líder: ${leaderId}`);
      return;
    }

    const config = await this.getConfig();
    const totalAmount = config.kitPrice + config.cardShippingFee;

    // Verificar monto
    if (Number(paymentData.amount) !== Number(totalAmount)) {
      strapi.log.warn(`Monto de kit no coincide: esperado ${totalAmount}, recibido ${paymentData.amount}`);
      return;
    }

    // Idempotencia
    const idempotencyKey = this.generateIdempotencyKey(leaderId, 'kit_purchase', paymentData.paymentId);
    const isFirst = await this.checkAndRecordIdempotency(idempotencyKey, 'leader_kit_purchase');
    if (!isFirst) {
      strapi.log.info(`Kit payment ya procesado (idempotente): leaderId=${leaderId}, paymentId=${paymentData.paymentId}`);
      return { ok: true, duplicate: true };
    }

    // Crear envío via Skydropx
    const shippingData = await this.createSkydropxShipment({
      leader,
      items: [{ description: 'Kit 5000 tarjetas QR', quantity: 1, value: config.kitPrice }],
      shippingFee: config.cardShippingFee,
    });

    if (!shippingData) {
      strapi.log.warn('No se pudo crear envío Skydropx para kit, pero el pago fue verificado');
    }

    const updateData = {
      kit_purchased: true,
      kit_purchase_date: new Date().toISOString(),
      kit_cards_received: 5000,
      mercado_pago_payment_id: paymentData.paymentId,
      publishedAt: new Date().toISOString(),
    };

    await strapi.entityService.update('api::leader.leader', leaderId, {
      data: updateData,
    });

    strapi.eventHub?.emit('leader_kit_purchased', {
      leaderId,
      kitPrice: config.kitPrice,
      shippingId: shippingData?.id,
      trackingNumber: shippingData?.tracking_number,
      paymentId: paymentData.paymentId,
      paymentMethod: paymentData.paymentMethod,
      amount: paymentData.amount,
    });

    return { success: true, shipping: shippingData };
  },

  /**
   * Maneja pago fallido de kit de líder
   */
  async handleKitPaymentFailure(leaderId) {
    const leader = await strapi.entityService.findOne('api::leader.leader', leaderId);
    if (!leader) return;

    strapi.eventHub?.emit('leader_kit_payment_failed', {
      leaderId,
      leaderStatus: leader.status,
    });
  },

}));
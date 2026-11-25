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
const crypto = require('crypto');

module.exports = createCoreService('api::driver-membership.driver-membership', ({ strapi }) => ({

  /**
   * Genera un ID de idempotencia determinista basado en membershipId + paymentId
   * Sin timestamp: misma transacción + operación = misma clave
   */
  generateIdempotencyKey(membershipId, paymentId) {
    const hash = crypto.createHash('sha256')
      .update(`${membershipId}:${paymentId}`)
      .digest('hex')
      .slice(0, 16);
    return `idem_${membershipId}_${hash}`;
  },

  /**
   * Verifica y registra idempotencia con estados (processing/completed/failed)
   * Usa operación atómica a nivel de BD para evitar race conditions
   * @returns {Object} { isFirst: boolean, record: Object|null }
   */
  async checkAndRecordIdempotency(idempotencyKey, operationType) {
    const now = new Date().toISOString();

    // Intentar operación atómica: INSERT ... ON CONFLICT (key) DO UPDATE
    // Esto es atómico en PostgreSQL y SQLite (con ON CONFLICT)
    try {
      // Usar query builder para upsert atómico
      const result = await strapi.db.connection.raw(`
        INSERT INTO idempotency_keys (key, operation_type, status, processed_at, published_at, created_at, updated_at)
        VALUES (?, ?, 'processing', ?, ?, ?, ?)
        ON CONFLICT (key) DO UPDATE SET
          status = CASE
            WHEN idempotency_keys.status = 'completed' THEN 'completed'
            WHEN idempotency_keys.status = 'processing' THEN 'processing'
            ELSE 'processing'
          END,
          error_message = CASE
            WHEN idempotency_keys.status = 'failed' THEN NULL
            ELSE idempotency_keys.error_message
          END,
          processed_at = ?,
          updated_at = ?,
          published_at = CASE
            WHEN idempotency_keys.published_at IS NULL THEN ?
            ELSE idempotency_keys.published_at
          END
        RETURNING *;
      `, [idempotencyKey, operationType, now, now, now, now, now, now, now, now]);

      const record = result.rows?.[0] || result[0];
      if (!record) {
        // Fallback: buscar el registro existente
        const existing = await strapi.entityService.findMany('api::idempotency-key.idempotency-key', {
          filters: { key: idempotencyKey },
          limit: 1,
        });
        if (existing.length > 0) {
          const rec = existing[0];
          if (rec.status === 'completed') {
            return { isFirst: false, record: rec };
          }
          if (rec.status === 'processing') {
            return { isFirst: false, record: rec };
          }
          // failed -> actualizar a processing
          await strapi.entityService.update('api::idempotency-key.idempotency-key', rec.id, {
            data: { status: 'processing', error_message: null, processed_at: now, publishedAt: now },
          });
          return { isFirst: true, record: { ...rec, status: 'processing' } };
        }
        throw new Error('No se pudo crear ni encontrar registro de idempotencia');
      }

      const status = record.status;
      if (status === 'completed') {
        strapi.log.info(`Operación ya completada (idempotente): ${idempotencyKey} (${operationType})`);
        return { isFirst: false, record };
      }
      if (status === 'processing') {
        // Verificar si fue insertado ahora o ya existía
        const wasInserted = record.created_at === record.updated_at;
        if (wasInserted) {
          return { isFirst: true, record };
        }
        strapi.log.warn(`Operación en curso: ${idempotencyKey} (${operationType})`);
        return { isFirst: false, record };
      }
      // status === 'failed' -> se actualizó a processing
      return { isFirst: true, record: { ...record, status: 'processing' } };
    } catch (err) {
      // Fallback al método original si falla el raw query
      strapi.log.warn(`Fallo en idempotencia atómica, usando fallback: ${err.message}`);
      return this.checkAndRecordIdempotencyFallback(idempotencyKey, operationType);
    }
  },

  /**
   * Fallback al método original de check-and-create
   */
  async checkAndRecordIdempotencyFallback(idempotencyKey, operationType) {
    const now = new Date().toISOString();

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
      // Si está en 'failed', permitir reintento actualizando a processing
      await strapi.entityService.update('api::idempotency-key.idempotency-key', record.id, {
        data: {
          status: 'processing',
          error_message: null,
          processed_at: now,
          publishedAt: now,
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
          processed_at: now,
          publishedAt: now,
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

  /**
   * Marca una operación de idempotencia como completada
   */
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

  /**
   * Marca una operación de idempotencia como fallida
   */
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
   * Valida que el recurso pertenezca al usuario autenticado
   * @returns {Object|null} El recurso si pertenece al usuario, null si no
   */
  async authorizeDriverAccess(userId, driverId) {
    const driver = await strapi.entityService.findOne('api::driver.driver', driverId, {
      populate: ['user'],
    });
    if (!driver || driver.user?.id !== userId) {
      return null;
    }
    return driver;
  },

  /**
   * Valida que la membresía pertenezca al usuario autenticado
   * @returns {Object|null} La membresía si pertenece al usuario, null si no
   */
  async authorizeMembershipAccess(userId, membershipId) {
    const membership = await strapi.entityService.findOne('api::driver-membership.driver-membership', membershipId, {
      populate: ['driver.user'],
    });
    if (!membership || membership.driver?.user?.id !== userId) {
      return null;
    }
    return membership;
  },

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
   * Founders: primer mes GRATIS (0), luego 12 meses a $300
   */
  calculatePrice(plan, isPromoEligible, isFirstMonth = false) {
    if (plan === 'promo' && isPromoEligible) {
      // Primer mes gratis para fundadores
      if (isFirstMonth) return 0;
      return 300;
    }
    return 500;
  },

  /**
   * Crea una nueva membresía para un conductor (con autorización)
   * Founders: primer mes GRATIS, luego 12 meses a $300
   */
  async createMembership(driverId, userId, { plan, activationMode, isPromoEligible, promoSource, referredByLeaderId, statePartnerId }) {
    // Autorización: verificar que el driver pertenezca al usuario
    const driver = await this.authorizeDriverAccess(userId, driverId);
    if (!driver) {
      throw new Error('No autorizado: el conductor no pertenece al usuario');
    }

    const config = await this.getConfig();

    const now = new Date();
    let currentPeriodStart, currentPeriodEnd, nextPaymentDate, freeTripsGranted = 0, physicalCardsGranted = 0;
    let price, promoExpiresAt = null;
    const isFoundersPromo = plan === 'promo' && isPromoEligible;

    if (activationMode === 'pay_now') {
      currentPeriodStart = now;
      currentPeriodEnd = new Date(now);
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
      nextPaymentDate = new Date(currentPeriodEnd);

      // Founders: primer mes GRATIS
      price = this.calculatePrice(plan, isPromoEligible, true); // isFirstMonth = true
    } else {
      currentPeriodStart = new Date(now);
      currentPeriodStart.setMonth(currentPeriodStart.getMonth() + 1);
      currentPeriodEnd = new Date(currentPeriodStart);
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
      nextPaymentDate = new Date(currentPeriodStart);
      freeTripsGranted = config.driverFreeTripsCount;
      physicalCardsGranted = 100;

      // pay_later: el primer pago será en 1 mes, también gratis para founders
      price = this.calculatePrice(plan, isPromoEligible, true); // isFirstMonth = true
    }

    // Configurar expiración de promo (12 meses para founders)
    if (isFoundersPromo) {
      promoExpiresAt = new Date(now);
      promoExpiresAt.setMonth(promoExpiresAt.getMonth() + 12);
    }

    const membership = await strapi.entityService.create('api::driver-membership.driver-membership', {
      data: {
        driver: driverId,
        user: userId,
        plan,
        activation_mode: activationMode,
        status: 'pending',
        price_mxn: price, // Primer mes: 0 para founders
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

    if (activationMode === 'pay_later' && freeTripsGranted > 0) {
      await this.grantFreeTripsToDriver(driverId, freeTripsGranted);
    }

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
   * Valida un código QR de tarjeta física
   * Soporta dos formatos:
   * 1. Tarjeta física: card_id=UUID (valida contra qr-physical-card registry)
   * 2. Referral líder: ref=X&leader=Y (valida contra leader.leader) - compatibilidad
   * Retorna { valid: boolean, leaderId, cardId, leader, referralCode }
   */
  async validateQRCard(qrData) {
    try {
      // Parsear QR (URL o card_id directo)
      let cardId = null;
      let referralCode = null;
      let leaderId = null;

      try {
        const url = new URL(qrData, 'http://dummy.com');
        cardId = url.searchParams.get('card_id') || url.searchParams.get('cardId');
        referralCode = url.searchParams.get('ref');
        leaderId = url.searchParams.get('leader');
      } catch (e) {
        // Si no es URL, asumir card_id directo
        cardId = qrData;
      }

      // Formato 1: Tarjeta física con card_id único (nuevo)
      if (cardId) {
        const physicalCard = await strapi.entityService.findMany('api::qr-physical-card.qr-physical-card', {
          filters: { card_id: cardId },
          limit: 1,
          populate: ['leader', 'leader.user'],
        });

        if (physicalCard.length === 0) {
          return { valid: false, error: 'Tarjeta física no registrada en el sistema' };
        }

        const card = physicalCard[0];

        if (card.status !== 'issued') {
          return { valid: false, error: `Esta tarjeta ya fue ${card.status === 'scanned' ? 'escaneada' : card.status === 'used' ? 'usada' : 'anulada'}` };
        }

        if (!card.leader || card.leader.status !== 'active') {
          return { valid: false, error: 'El líder asociado no está activo' };
        }
        if (!card.leader.kit_purchased) {
          return { valid: false, error: 'El líder no ha comprado el kit de tarjetas' };
        }
        if (card.leader.cards_distributed >= card.leader.kit_cards_received) {
          return { valid: false, error: 'El líder ha distribuido todas sus tarjetas' };
        }

        return { valid: true, leaderId: card.leader.id, cardId: card.card_id, leader: card.leader, referralCode: card.leader.referral_code };
      }

      // Formato 2: Referral líder (compatibilidad - para registro de conductores)
      if (referralCode && leaderId) {
        const leaders = await strapi.entityService.findMany('api::leader.leader', {
          filters: { referral_code: referralCode, id: leaderId, status: 'active' },
          limit: 1,
          populate: ['user'],
        });

        if (leaders.length === 0) {
          return { valid: false, error: 'Líder no encontrado o inactivo' };
        }

        const leader = leaders[0];

        if (!leader.kit_purchased) {
          return { valid: false, error: 'El líder no ha comprado el kit de tarjetas' };
        }

        if (leader.cards_distributed >= leader.kit_cards_received) {
          return { valid: false, error: 'El líder ha distribuido todas sus tarjetas' };
        }

        return { valid: true, leaderId: leader.id, cardId: null, leader, referralCode };
      }

      return { valid: false, error: 'QR inválido: debe contener card_id o (ref + leader)' };
    } catch (err) {
      strapi.log.error('Error validando QR:', err);
      return { valid: false, error: 'Error validando tarjeta QR' };
    }
  },

  /**
   * Otorga viaje gratis por escaneo de tarjeta QR física
   * Valida contra registro de tarjetas emitidas
   */
  async grantFreeTripByQR(driverId, qrData) {
    const validation = await this.validateQRCard(qrData);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Verificar que el conductor no tenga ya un viaje gratis pendiente
    const driver = await strapi.entityService.findOne('api::driver.driver', driverId);
    if (!driver) {
      throw new Error('Conductor no encontrado');
    }

    if ((driver.free_trips || 0) > 0) {
      throw new Error('El conductor ya tiene un viaje gratis pendiente');
    }

    // Otorgar 1 viaje gratis
    await this.grantFreeTripsToDriver(driverId, 1);

    // Incrementar contador de tarjetas distribuidas del líder
    await strapi.entityService.update('api::leader.leader', validation.leaderId, {
      data: {
        cards_distributed: (validation.leader.cards_distributed || 0) + 1,
        publishedAt: new Date().toISOString(),
      },
    });

    strapi.eventHub?.emit('free_trip_granted_by_qr', {
      driverId,
      leaderId: validation.leaderId,
      referralCode: validation.referralCode,
    });

    return { success: true, message: 'Viaje gratis otorgado por tarjeta QR' };
  },

  /**
   * Procesa pago exitoso de Mercado Pago (con idempotencia)
   * Founders: actualiza precio a $300 para meses 2-13 después del primer pago gratis
   */
  async handlePaymentSuccess(membershipId, paymentData) {
    const idempotencyKey = this.generateIdempotencyKey(membershipId, paymentData.paymentId);
    const { isFirst, record } = await this.checkAndRecordIdempotency(idempotencyKey, 'payment_success');
    if (!isFirst) {
      strapi.log.info(`Pago ya procesado (idempotente): membershipId=${membershipId}, paymentId=${paymentData.paymentId}`);
      return { ok: true, duplicate: true };
    }

    try {
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

      const promoExpiresAt = membership.promo_expires_at ? new Date(membership.promo_expires_at) : null;
      const isFoundersPromo = membership.plan === 'promo' && promoExpiresAt && promoExpiresAt > now;
      const nextPaymentDate = nextPeriodEnd;
      const promoEnded = promoExpiresAt && nextPaymentDate > promoExpiresAt;

      const updateData = {
        status: 'active',
        last_payment_date: now.toISOString(),
        last_payment_amount: paymentData.amount,
        current_period_start: membership.current_period_end,
        current_period_end: nextPeriodEnd.toISOString(),
        next_payment_date: nextPeriodEnd.toISOString(),
        failed_payments_count: 0,
        last_processed_payment_id: paymentData.paymentId,
        publishedAt: new Date().toISOString(),
      };

      // Founders campaign logic:
      // - Primer mes: GRATIS (price_mxn = 0)
      // - Meses 2-13 (12 pagos): $300 c/u
      // - Mes 14+: $500 (precio regular)
      if (isFoundersPromo) {
        if (membership.price_mxn === 0) {
          // Primer pago gratis → siguiente es $300
          updateData.price_mxn = 300;
        } else if (promoEnded) {
          // Pasaron 12 meses de promo → precio regular $500
          updateData.price_mxn = 500;
        } else {
          // Dentro de los 12 meses de promo → mantener $300
          updateData.price_mxn = 300;
        }
      }

      if (membership.activation_mode === 'pay_later' && membership.status === 'pending') {
        updateData.status = 'active';
      }

      const updated = await strapi.entityService.update('api::driver-membership.driver-membership', membershipId, {
        data: updateData,
      });

      await this.processCommissions(membership, paymentData.amount, paymentData.paymentId);

      strapi.eventHub?.emit('driver_membership_payment_success', {
        membershipId,
        driverId: membership.driver?.id,
        amount: paymentData.amount,
        period: {
          start: membership.current_period_end,
          end: nextPeriodEnd.toISOString(),
        },
      });

      await this.markIdempotencyCompleted(idempotencyKey, { membershipId, paymentId: paymentData.paymentId });

      return { ok: true, data: updated };
    } catch (err) {
      await this.markIdempotencyFailed(idempotencyKey, err.message);
      throw err;
    }
  },

  /**
   * Procesa comisiones para líder y socio estatal
   * Idempotencia por paymentId + recipientType + recipientUserId + concept (permite renovaciones mensuales)
   */
  async processCommissions(membership, amount, paymentId) {
    const config = await this.getConfig();

    if (membership.referred_by_leader) {
      const leaderCommission = (amount * config.leaderCommissionPct) / 100;
      // Usar user ID del líder, no entity ID
      const leaderUserId = membership.referred_by_leader.user?.id;
      if (leaderUserId) {
        await this.recordCommission({
          paymentId,
          membershipId: membership.id,
          recipientType: 'leader',
          recipientId: leaderUserId,
          amount: leaderCommission,
          percentage: config.leaderCommissionPct,
          concept: 'driver_membership',
        });
      }
    }

    if (membership.state_partner) {
      const stateCommission = (amount * config.statePartnerCommissionPct) / 100;
      // Usar user ID del socio, no entity ID
      const partnerUserId = membership.state_partner.user?.id;
      if (partnerUserId) {
        await this.recordCommission({
          paymentId,
          membershipId: membership.id,
          recipientType: 'state_partner',
          recipientId: partnerUserId,
          amount: stateCommission,
          percentage: config.statePartnerCommissionPct,
          concept: 'driver_membership',
        });
      }
    }
  },

  /**
   * Registra una comisión en la base de datos con idempotencia
   * Idempotencia incluye recipientType para distinguir leader vs state_partner con mismo userId
   */
  async recordCommission({ paymentId, membershipId, recipientType, recipientId, amount, percentage, concept }) {
    const idempotencyKey = this.generateIdempotencyKey(
      `${paymentId}:${recipientType}:${recipientId}:${concept}`,
      'commission',
      ''
    );
    const { isFirst } = await this.checkAndRecordIdempotency(idempotencyKey, 'commission');
    if (!isFirst) {
      strapi.log.info(`Comisión ya registrada (idempotente): paymentId=${paymentId}, recipientType=${recipientType}, recipient=${recipientId}, concept=${concept}`);
      return { ok: true, duplicate: true };
    }

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
          payment_reference: paymentId,
          created_at: new Date().toISOString(),
          publishedAt: new Date().toISOString(),
        },
      });
      await this.markIdempotencyCompleted(idempotencyKey, { paymentId, recipientType, recipientId, concept });
    } catch (err) {
      await this.markIdempotencyFailed(idempotencyKey, err.message);
      strapi.log.warn('No se pudo registrar comisión:', err.message);
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
   * Cancela una membresía (con autorización)
   */
  async cancelMembership(userId, membershipId, reason) {
    const membership = await this.authorizeMembershipAccess(userId, membershipId);
    if (!membership) {
      throw new Error('No autorizado: la membresía no pertenece al usuario');
    }

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
   * Obtiene la membresía activa de un conductor (con autorización)
   */
  async getActiveMembership(userId, driverId) {
    const driver = await this.authorizeDriverAccess(userId, driverId);
    if (!driver) return null;

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
   * Verifica si un conductor tiene membresía activa (con autorización)
   */
  async hasActiveMembership(userId, driverId) {
    const membership = await this.getActiveMembership(userId, driverId);
    return membership && ['active', 'pending'].includes(membership.status);
  },

  /**
   * Crea preferencia de pago en Mercado Pago para membresía (con autorización)
   */
  async createMercadoPagoPreference(userId, membershipId, payerEmail, backUrl) {
    const membership = await this.authorizeMembershipAccess(userId, membershipId);
    if (!membership) {
      throw new Error('No autorizado: la membresía no pertenece al usuario');
    }

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error('MERCADO_PAGO_ACCESS_TOKEN no configurado');
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
   * Crea suscripción recurrente (preapproval) en Mercado Pago (con autorización)
   */
  async createMercadoPagoPreapproval(userId, membershipId, payerEmail, cardToken) {
    const membership = await this.authorizeMembershipAccess(userId, membershipId);
    if (!membership) {
      throw new Error('No autorizado: la membresía no pertenece al usuario');
    }

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error('MERCADO_PAGO_ACCESS_TOKEN no configurado');
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
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
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
   * Webhook de Mercado Pago - procesa resultados y ejecuta operaciones reales
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
        await this.handlePaymentSuccess(result.externalReference, {
          amount: result.amount,
          paymentId: result.paymentId,
          payerEmail: result.payerEmail,
          paymentMethod: result.paymentMethod,
          paymentType: result.paymentType,
        });
        return { ok: true, processed: 'payment_approved', externalReference: result.externalReference };

      case 'payment_failed':
        await this.handlePaymentFailure(result.externalReference);
        return { ok: true, processed: 'payment_failed', externalReference: result.externalReference, status: result.status };

      case 'payment_pending':
        strapi.log.info(`Pago pendiente: ${result.externalReference}, status: ${result.status}`);
        return { ok: true, processed: 'payment_pending', externalReference: result.externalReference, status: result.status };

      case 'preapproval_authorized':
        await this.handlePreapprovalAuthorized(result.externalReference, {
          preapprovalId: result.preapprovalId,
          payerId: result.payerId,
          nextPaymentDate: result.nextPaymentDate,
        });
        return { ok: true, processed: 'preapproval_authorized', externalReference: result.externalReference };

      case 'preapproval_cancelled':
      case 'preapproval_paused':
        await this.handlePreapprovalStatusChange(result.externalReference, result.type);
        return { ok: true, processed: result.type, externalReference: result.externalReference };

      case 'preapproval_update':
        strapi.log.info(`Actualización de preapproval: ${result.externalReference}, status: ${result.status}`);
        return { ok: true, processed: 'preapproval_update', externalReference: result.externalReference };

      default:
        strapi.log.info(`Evento MP no procesado: ${result.type}`);
        return { ok: true, ignored: true };
    }
  },

  /**
   * Maneja preapproval autorizada (suscripción activa)
   */
  async handlePreapprovalAuthorized(membershipId, data) {
    const idempotencyKey = this.generateIdempotencyKey(membershipId, data.preapprovalId);
    const { isFirst } = await this.checkAndRecordIdempotency(idempotencyKey, 'preapproval_update');
    if (!isFirst) {
      strapi.log.info(`Preapproval ya procesada (idempotente): membershipId=${membershipId}, preapprovalId=${data.preapprovalId}`);
      return { ok: true, duplicate: true };
    }

    try {
      const membership = await strapi.entityService.findOne('api::driver-membership.driver-membership', membershipId);
      if (!membership) {
        strapi.log.warn(`Membresía no encontrada para preapproval: ${membershipId}`);
        return;
      }

      await strapi.entityService.update('api::driver-membership.driver-membership', membershipId, {
        data: {
          mercado_pago_subscription_id: data.preapprovalId,
          mercado_pago_customer_id: data.payerId,
          publishedAt: new Date().toISOString(),
        },
      });

      strapi.eventHub?.emit('driver_membership_preapproval_authorized', {
        membershipId,
        driverId: membership.driver,
        preapprovalId: data.preapprovalId,
        nextPaymentDate: data.nextPaymentDate,
      });

      await this.markIdempotencyCompleted(idempotencyKey, { membershipId, preapprovalId: data.preapprovalId });
      return { ok: true };
    } catch (err) {
      await this.markIdempotencyFailed(idempotencyKey, err.message);
      throw err;
    }
  },

  /**
   * Maneja cambios de estado en preapproval (cancelled, paused)
   */
  async handlePreapprovalStatusChange(membershipId, type) {
    const idempotencyKey = this.generateIdempotencyKey(membershipId, `${type}_${Date.now()}`);
    const { isFirst } = await this.checkAndRecordIdempotency(idempotencyKey, 'preapproval_update');
    if (!isFirst) {
      strapi.log.info(`Cambio de estado preapproval ya procesado (idempotente): membershipId=${membershipId}, type=${type}`);
      return { ok: true, duplicate: true };
    }

    try {
      const membership = await strapi.entityService.findOne('api::driver-membership.driver-membership', membershipId);
      if (!membership) return;

      const newStatus = type === 'preapproval_cancelled' ? 'cancelled' : 'past_due';

      await strapi.entityService.update('api::driver-membership.driver-membership', membershipId, {
        data: {
          status: newStatus,
          cancelled_at: type === 'preapproval_cancelled' ? new Date().toISOString() : null,
          cancellation_reason: type === 'preapproval_cancelled' ? 'Suscripción cancelada en Mercado Pago' : null,
          publishedAt: new Date().toISOString(),
        },
      });

      strapi.eventHub?.emit('driver_membership_preapproval_status_change', {
        membershipId,
        driverId: membership.driver,
        type,
      });

      await this.markIdempotencyCompleted(idempotencyKey, { membershipId, type });
      return { ok: true };
    } catch (err) {
      await this.markIdempotencyFailed(idempotencyKey, err.message);
      throw err;
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
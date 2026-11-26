'use strict';

/**
 * free-trip-entitlement service
 *
 * Gestiona la concesión de viajes gratis a pasajeros.
 * Fuentes de viaje gratis:
 * - 'video': 5 anuncios completados en ad-session
 * - 'qr': Escaneo de tarjeta física QR
 *
 * Reglas de negocio:
 * - 1 viaje gratis por cuenta (usuario)
 * - Descuento máximo: $100 MXN (configurable via site-setting)
 * - Validez QR: 30 días por defecto (configurable)
 * - El viaje gratis se aplica en el próximo viaje (isTripFree = true)
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::free-trip-entitlement.free-trip-entitlement', ({ strapi }) => ({

  /**
   * Obtiene la configuración de viajes gratis desde site-setting
   */
  async getConfig() {
    const siteSetting = await strapi.entityService.findOne('api::site-setting.site-setting', 1, {
      fields: [
        'taxi_driver_free_trips_count',
        'taxi_free_trip_max_discount_mxn',
        'taxi_free_trip_qr_validity_days',
      ],
    });
    return {
      driverFreeTripsCount: siteSetting?.taxi_driver_free_trips_count ?? 5,
      maxDiscountMxn: siteSetting?.taxi_free_trip_max_discount_mxn ?? 100,
      qrValidityDays: siteSetting?.taxi_free_trip_qr_validity_days ?? 30,
    };
  },

  /**
   * Verifica si el usuario ya tiene un viaje gratis activo/pendiente
   * Un usuario solo puede tener 1 viaje gratis a la vez
   */
  async hasActiveFreeTrip(userId) {
    const existing = await strapi.entityService.findMany('api::free-trip-entitlement.free-trip-entitlement', {
      filters: {
        usuario: userId,
        estado: { $in: ['pendiente', 'activo'] },
      },
      limit: 1,
    });
    return existing.length > 0;
  },

  /**
   * Concede un viaje gratis por visualización de 5 anuncios (video)
   * Se llama desde ad-session.controller cuando la sesión se completa con 5 items completados
   */
  async grantFreeTripByVideo(userId, sessionId) {
    const config = await this.getConfig();

    // Verificar si ya tiene uno activo
    const yaTiene = await this.hasActiveFreeTrip(userId);
    if (yaTiene) {
      return { success: false, reason: 'USER_ALREADY_HAS_FREE_TRIP', message: 'El usuario ya tiene un viaje gratis pendiente o activo' };
    }

    // Crear el entitlement
    const entitlement = await strapi.entityService.create('api::free-trip-entitlement.free-trip-entitlement', {
      data: {
        usuario: userId,
        fuente: 'video',
        estado: 'pendiente', // Se vuelve 'activo' cuando se usa en un viaje
        max_descuento_mxn: config.maxDiscountMxn,
        sesion_origen: sessionId,
        creado_en: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
      },
    });

    // Emitir evento para logging/auditoría
    strapi.eventHub?.emit('free_trip_granted', {
      userId,
      fuente: 'video',
      entitlementId: entitlement.id,
      maxDiscountMxn: config.maxDiscountMxn,
      sessionId,
    });

    return { success: true, entitlement };
  },

  /**
   * Concede un viaje gratis por escaneo de tarjeta QR física
   * Valida contra el registro de tarjetas físicas emitidas (qr-physical-card)
   * El QR debe contener: card_id (UUID único de la tarjeta)
   * Operación atómica: valida tarjeta, crea entitlement, actualiza tarjeta e incrementa líder
   */
  async grantFreeTripByQR(userId, qrCode, cardId = null) {
    const config = await this.getConfig();

    // Verificar si ya tiene uno activo
    const yaTiene = await this.hasActiveFreeTrip(userId);
    if (yaTiene) {
      return { success: false, reason: 'USER_ALREADY_HAS_FREE_TRIP', message: 'El usuario ya tiene un viaje gratis pendiente o activo' };
    }

    // Extraer card_id del QR
    // Formato esperado: URL con query param card_id=... o card_id directo
    let extractedCardId = cardId;
    if (!extractedCardId && qrCode) {
      try {
        const url = new URL(qrCode, 'http://dummy.com');
        extractedCardId = url.searchParams.get('card_id') || url.searchParams.get('cardId');
      } catch (e) {
        // Si no es URL válida, asumir que es el card_id directo
        extractedCardId = qrCode;
      }
    }

    if (!extractedCardId) {
      return { success: false, reason: 'INVALID_QR_CODE', message: 'Código QR inválido: no contiene card_id' };
    }

    // Validar contra registro de tarjetas físicas emitidas
    const physicalCard = await strapi.entityService.findMany('api::qr-physical-card.qr-physical-card', {
      filters: { card_id: extractedCardId },
      limit: 1,
      populate: ['leader', 'leader.user'],
    });

    if (physicalCard.length === 0) {
      return { success: false, reason: 'CARD_NOT_FOUND', message: 'Tarjeta física no registrada en el sistema' };
    }

    const card = physicalCard[0];

    // Verificar estado de la tarjeta
    if (card.status !== 'issued') {
      return { success: false, reason: 'CARD_ALREADY_USED', message: `Esta tarjeta ya fue ${card.status === 'scanned' ? 'escaneada' : card.status === 'used' ? 'usada' : 'anulada'}` };
    }

    // Verificar que el líder esté activo y tenga kit comprado
    if (!card.leader || card.leader.status !== 'active') {
      return { success: false, reason: 'LEADER_INACTIVE', message: 'El líder asociado no está activo' };
    }
    if (!card.leader.kit_purchased) {
      return { success: false, reason: 'KIT_NOT_PURCHASED', message: 'El líder no ha comprado el kit de tarjetas' };
    }
    if (card.leader.cards_distributed >= card.leader.kit_cards_received) {
      return { success: false, reason: 'CARDS_EXHAUSTED', message: 'El líder ha distribuido todas sus tarjetas' };
    }

    // Verificar si la tarjeta ya tiene un entitlement asociado
    if (card.free_trip_entitlement) {
      return { success: false, reason: 'CARD_ALREADY_LINKED', message: 'Esta tarjeta ya tiene un viaje gratis asociado' };
    }

    // Calcular expiración
    const expiraEn = new Date();
    expiraEn.setDate(expiraEn.getDate() + config.qrValidityDays);
    const now = new Date().toISOString();

    // Operación atómica: crear entitlement, actualizar tarjeta e incrementar líder
    let entitlementId;
    await strapi.db.transaction(async (trx) => {
      // 1. Crear el entitlement
      const [entitlement] = await trx('free_trip_entitlements')
        .insert({
          usuario: userId,
          fuente: 'qr',
          estado: 'pendiente',
          max_descuento_mxn: config.maxDiscountMxn,
          qr_card_id: extractedCardId,
          qr_scaneado_en: now,
          qr_expira_en: expiraEn.toISOString(),
          creado_en: now,
          published_at: now,
          created_at: now,
          updated_at: now,
        })
        .returning('id');
      entitlementId = entitlement.id;

      // 2. Actualizar tarjeta física: marcar como escaneada y vincular entitlement
      await trx('qr_physical_cards')
        .where({ id: card.id })
        .update({
          status: 'scanned',
          scanned_at: now,
          scanned_by_user: userId,
          free_trip_entitlement: entitlementId,
          updated_at: now,
        });

      // 3. Incrementar contador de tarjetas distribuidas del líder
      await trx('leaders')
        .where({ id: card.leader.id })
        .increment('cards_distributed', 1);
    });

    const entitlement = await strapi.entityService.findOne('api::free-trip-entitlement.free-trip-entitlement', entitlementId);

    // Emitir evento
    strapi.eventHub?.emit('free_trip_granted', {
      userId,
      fuente: 'qr',
      entitlementId: entitlement.id,
      maxDiscountMxn: config.maxDiscountMxn,
      qrCardId: extractedCardId,
      leaderId: card.leader.id,
    });

    return { success: true, entitlement, leaderId: card.leader.id };
  },

  /**
   * Marca un viaje gratis como usado (cuando se completa un viaje con isTripFree = true)
   */
  async markFreeTripAsUsed(userId, viajeId) {
    const entitlement = await strapi.entityService.findMany('api::free-trip-entitlement.free-trip-entitlement', {
      filters: {
        usuario: userId,
        estado: { $in: ['pendiente', 'activo'] },
      },
      limit: 1,
    });

    if (entitlement.length === 0) {
      return { success: false, reason: 'NO_ACTIVE_FREE_TRIP', message: 'No hay viaje gratis disponible para usar' };
    }

    const updated = await strapi.entityService.update('api::free-trip-entitlement.free-trip-entitlement', entitlement[0].id, {
      data: {
        estado: 'usado',
        viaje_usado_en: viajeId,
        usado_en: new Date().toISOString(),
      },
    });

    strapi.eventHub?.emit('free_trip_used', {
      userId,
      entitlementId: entitlement[0].id,
      viajeId,
      fuente: entitlement[0].fuente,
    });

    return { success: true, entitlement: updated };
  },

  /**
   * Obtiene el viaje gratis activo/pendiente del usuario
   */
  async getActiveFreeTrip(userId) {
    const entitlements = await strapi.entityService.findMany('api::free-trip-entitlement.free-trip-entitlement', {
      filters: {
        usuario: userId,
        estado: { $in: ['pendiente', 'activo'] },
      },
      limit: 1,
      populate: ['usuario'],
    });
    return entitlements[0] || null;
  },

  /**
   * Verifica si un viaje puede usar el descuento de viaje gratis
   * (el pasajero tiene uno pendiente y el viaje no supera el máximo)
   */
  async canApplyFreeTrip(userId, costoViaje) {
    const config = await this.getConfig();
    const entitlement = await this.getActiveFreeTrip(userId);

    if (!entitlement) return { canApply: false, reason: 'NO_FREE_TRIP' };

    // Verificar expiración para QR
    if (entitlement.fuente === 'qr' && entitlement.qr_expira_en) {
      if (new Date(entitlement.qr_expira_en) < new Date()) {
        // Marcar como expirado
        await strapi.entityService.update('api::free-trip-entitlement.free-trip-entitlement', entitlement.id, {
          data: { estado: 'expirado' },
        });
        return { canApply: false, reason: 'QR_EXPIRED' };
      }
    }

    const descuentoAplicable = Math.min(costoViaje, config.maxDiscountMxn);
    return {
      canApply: true,
      entitlement,
      maxDiscount: config.maxDiscountMxn,
      discountAmount: descuentoAplicable,
    };
  },

}));
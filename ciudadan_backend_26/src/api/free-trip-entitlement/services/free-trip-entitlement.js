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
   * Se llama desde endpoint de escaneo QR (frontend pasajero o conductor)
   */
  async grantFreeTripByQR(userId, qrCode, cardId = null) {
    const config = await this.getConfig();

    // Verificar si ya tiene uno activo
    const yaTiene = await this.hasActiveFreeTrip(userId);
    if (yaTiene) {
      return { success: false, reason: 'USER_ALREADY_HAS_FREE_TRIP', message: 'El usuario ya tiene un viaje gratis pendiente o activo' };
    }

    // Validar QR (formato básico: contiene ID de tarjeta)
    if (!qrCode || typeof qrCode !== 'string') {
      return { success: false, reason: 'INVALID_QR_CODE', message: 'Código QR inválido' };
    }

    // Verificar si la tarjeta ya fue usada
    const existingCard = await strapi.entityService.findMany('api::free-trip-entitlement.free-trip-entitlement', {
      filters: {
        qr_card_id: cardId || qrCode,
        estado: { $in: ['usado', 'activo', 'pendiente'] },
      },
      limit: 1,
    });
    if (existingCard.length > 0) {
      return { success: false, reason: 'QR_CARD_ALREADY_USED', message: 'Esta tarjeta QR ya fue utilizada' };
    }

    // Calcular expiración
    const expiraEn = new Date();
    expiraEn.setDate(expiraEn.getDate() + config.qrValidityDays);

    // Crear el entitlement
    const entitlement = await strapi.entityService.create('api::free-trip-entitlement.free-trip-entitlement', {
      data: {
        usuario: userId,
        fuente: 'qr',
        estado: 'pendiente',
        max_descuento_mxn: config.maxDiscountMxn,
        qr_card_id: cardId || qrCode,
        qr_scaneado_en: new Date().toISOString(),
        qr_expira_en: expiraEn.toISOString(),
        creado_en: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
      },
    });

    // Emitir evento
    strapi.eventHub?.emit('free_trip_granted', {
      userId,
      fuente: 'qr',
      entitlementId: entitlement.id,
      maxDiscountMxn: config.maxDiscountMxn,
      qrCardId: cardId || qrCode,
    });

    return { success: true, entitlement };
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
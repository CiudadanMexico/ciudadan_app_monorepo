'use strict';

/**
 * free-trip-entitlement controller
 *
 * Endpoints para gestión de viajes gratis de pasajeros:
 * - POST /api/free-trips/qr-scan : Escanear tarjeta QR física
 * - GET  /api/free-trips/status  : Ver viaje gratis activo del usuario
 * - POST /api/free-trips/apply   : Aplicar viaje gratis a un viaje (interno)
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::free-trip-entitlement.free-trip-entitlement', ({ strapi }) => ({

  /**
   * POST /api/free-trips/qr-scan
   * Body: { qrCode, cardId? }
   * Escanea una tarjeta QR física y concede viaje gratis si es válida
   */
  async qrScan(ctx) {
    const { qrCode, cardId } = ctx.request.body || {};
    const user = ctx.state.strapiUser || ctx.state.user;

    if (!user) {
      return ctx.throw(401, 'Usuario no autenticado');
    }

    if (!qrCode) {
      return ctx.throw(400, 'Código QR requerido');
    }

    try {
      const service = strapi.service('api::free-trip-entitlement.free-trip-entitlement');
      const result = await service.grantFreeTripByQR(user.id, qrCode, cardId);

      if (!result.success) {
        return ctx.body = {
          data: {
            success: false,
            reason: result.reason,
            message: result.message
          }
        };
      }

      ctx.body = {
        data: {
          success: true,
          entitlement: result.entitlement,
          message: '¡Viaje gratis concedido! Tienes un viaje gratis pendiente (máx. $100 MXN).'
        }
      };
    } catch (err) {
      strapi.log.error('Error en qrScan:', err);
      ctx.throw(500, 'Error procesando el código QR');
    }
  },

  /**
   * GET /api/free-trips/status
   * Devuelve el viaje gratis activo/pendiente del usuario autenticado
   */
  async status(ctx) {
    const user = ctx.state.strapiUser || ctx.state.user;

    if (!user) {
      return ctx.throw(401, 'Usuario no autenticado');
    }

    try {
      const service = strapi.service('api::free-trip-entitlement.free-trip-entitlement');
      const entitlement = await service.getActiveFreeTrip(user.id);

      if (!entitlement) {
        return ctx.body = { data: { hasFreeTrip: false } };
      }

      // Verificar expiración para QR
      let isExpired = false;
      if (entitlement.fuente === 'qr' && entitlement.qr_expira_en) {
        isExpired = new Date(entitlement.qr_expira_en) < new Date();
        if (isExpired) {
          await strapi.entityService.update('api::free-trip-entitlement.free-trip-entitlement', entitlement.id, {
            data: { estado: 'expirado' },
          });
          return ctx.body = { data: { hasFreeTrip: false, expired: true } };
        }
      }

      ctx.body = {
        data: {
          hasFreeTrip: true,
          entitlement: {
            id: entitlement.id,
            fuente: entitlement.fuente,
            estado: entitlement.estado,
            maxDescuentoMxn: entitlement.max_descuento_mxn,
            creadoEn: entitlement.creado_en,
            qrExpiraEn: entitlement.qr_expira_en || null,
          }
        }
      };
    } catch (err) {
      strapi.log.error('Error en status:', err);
      ctx.throw(500, 'Error consultando estado de viaje gratis');
    }
  },

  /**
   * POST /api/free-trips/apply
   * Body: { viajeId, costoViaje }
   * Aplica el viaje gratis a un viaje específico (llamado desde viaje service)
   * Requiere autenticación de servicio interno o pasajero
   */
  async apply(ctx) {
    const { viajeId, costoViaje } = ctx.request.body || {};
    const user = ctx.state.strapiUser || ctx.state.user;

    if (!user) {
      return ctx.throw(401, 'Usuario no autenticado');
    }

    if (!viajeId || typeof costoViaje !== 'number') {
      return ctx.throw(400, 'viajeId y costoViaje son requeridos');
    }

    try {
      const service = strapi.service('api::free-trip-entitlement.free-trip-entitlement');

      // Verificar si se puede aplicar
      const check = await service.canApplyFreeTrip(user.id, costoViaje);
      if (!check.canApply) {
        return ctx.body = {
          data: {
            success: false,
            reason: check.reason,
            message: check.reason === 'NO_FREE_TRIP'
              ? 'No tienes viaje gratis disponible'
              : check.reason === 'QR_EXPIRED'
                ? 'Tu tarjeta QR ha expirado'
                : 'No se puede aplicar el viaje gratis'
          }
        };
      }

      // Marcar como usado
      const result = await service.markFreeTripAsUsed(user.id, viajeId);

      if (!result.success) {
        return ctx.body = { data: { success: false, reason: result.reason } };
      }

      const descuento = Math.min(costoViaje, check.maxDiscount);

      ctx.body = {
        data: {
          success: true,
          discountApplied: descuento,
          maxDiscount: check.maxDiscount,
          message: `Viaje gratis aplicado: $${descuento} MXN de descuento`
        }
      };
    } catch (err) {
      strapi.log.error('Error en apply:', err);
      ctx.throw(500, 'Error aplicando viaje gratis');
    }
  },

  /**
   * GET /api/free-trips/check/:viajeId
   * Verifica si un viaje puede tener descuento de viaje gratis (para conductor)
   * No consume el viaje gratis, solo informa
   */
  async checkForTrip(ctx) {
    const { viajeId } = ctx.params;
    const { costoViaje } = ctx.query;

    const user = ctx.state.strapiUser || ctx.state.user;
    if (!user) {
      return ctx.throw(401, 'Usuario no autenticado');
    }

    const costo = Number(costoViaje);
    if (!costo || costo <= 0) {
      return ctx.throw(400, 'costoViaje requerido');
    }

    try {
      const service = strapi.service('api::free-trip-entitlement.free-trip-entitlement');
      const check = await service.canApplyFreeTrip(user.id, costo);

      ctx.body = { data: check };
    } catch (err) {
      strapi.log.error('Error en checkForTrip:', err);
      ctx.throw(500, 'Error verificando viaje gratis');
    }
  },

}));
'use strict';

/**
 * driver-membership controller
 *
 * Endpoints para gestión de membresía de conductores:
 * - POST /api/driver-membership/create : Crear membresía
 * - GET  /api/driver-membership/me     : Mi membresía actual
 * - POST /api/driver-membership/preference : Crear preferencia de pago MP
 * - POST /api/driver-membership/preapproval : Crear suscripción recurrente MP
 * - POST /api/driver-membership/cancel : Cancelar membresía
 * - POST /api/driver-membership/webhook/mercadopago : Webhook MP
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::driver-membership.driver-membership', ({ strapi }) => ({

  /**
   * POST /api/driver-membership/create
   * Body: { plan: 'normal'|'promo', activationMode: 'pay_now'|'pay_later', driverId?, referralCode?, leaderId? }
   * Crea una nueva membresía para el conductor autenticado
   */
  async create(ctx) {
    const user = ctx.state.strapiUser || ctx.state.user;
    if (!user) {
      return ctx.throw(401, 'Usuario no autenticado');
    }

    const { plan, activationMode, driverId, referralCode, leaderId } = ctx.request.body || {};

    if (!plan || !['normal', 'promo'].includes(plan)) {
      return ctx.throw(400, 'Plan inválido: debe ser "normal" o "promo"');
    }
    if (!activationMode || !['pay_now', 'pay_later'].includes(activationMode)) {
      return ctx.throw(400, 'Modo de activación inválido: debe ser "pay_now" o "pay_later"');
    }

    // Buscar conductor del usuario
    let driver = null;
    if (driverId) {
      driver = await strapi.entityService.findOne('api::driver.driver', driverId);
    } else {
      const drivers = await strapi.entityService.findMany('api::driver.driver', {
        filters: { user: user.id },
        limit: 1,
      });
      driver = drivers[0];
    }

    if (!driver) {
      return ctx.throw(404, 'Conductor no encontrado');
    }

    // Verificar si ya tiene membresía activa
    const existingMembership = await strapi.service('api::driver-membership.driver-membership').getActiveMembership(user.id, driver.id);
    if (existingMembership) {
      return ctx.throw(409, 'El conductor ya tiene una membresía activa');
    }

    // Verificar elegibilidad promo
    const isPromoEligible = driver.promo_eligible === true;
    if (plan === 'promo' && !isPromoEligible) {
      return ctx.throw(400, 'El conductor no es elegible para el plan promocional');
    }

    // Determinar leader y state partner del conductor
    let referredByLeaderId = null;
    let statePartnerId = null;

    // Prioridad 1: referralCode y leaderId desde el QR del líder
    if (referralCode && leaderId) {
      // Verificar que el leaderId coincida con el referralCode
      const leader = await strapi.entityService.findOne('api::leader.leader', leaderId);
      if (leader && leader.referral_code === referralCode) {
        referredByLeaderId = leaderId;
      } else {
        strapi.log.warn('Leader ID no coincide con referral code:', { referralCode, leaderId });
      }
    } else if (referralCode) {
      // Prioridad 2: solo referralCode, buscar leader por código
      const leaders = await strapi.entityService.findMany('api::leader.leader', {
        filters: { referral_code: referralCode, status: 'active' },
        limit: 1,
      });
      if (leaders.length > 0) {
        referredByLeaderId = leaders[0].id;
      }
    }

    // Prioridad 3: Si el conductor tiene agencia, buscar leader asociado
    if (!referredByLeaderId && driver.agency) {
      const agency = await strapi.entityService.findOne('api::agencia.agencia', driver.agency, {
        populate: ['leader'],
      });
      if (agency?.leader) {
        referredByLeaderId = agency.leader.id;
      }
    }

    // Buscar state partner por estado del conductor
    if (driver.state) {
      const statePartners = await strapi.entityService.findMany('api::state-partner.state-partner', {
        filters: { state: driver.state, status: 'active' },
        limit: 1,
      });
      if (statePartners.length > 0) {
        statePartnerId = statePartners[0].id;
      }
    }

    try {
      const service = strapi.service('api::driver-membership.driver-membership');
      const membership = await service.createMembership(driver.id, user.id, {
        plan,
        activationMode,
        isPromoEligible,
        promoSource: driver.promo_source,
        referredByLeaderId,
        statePartnerId,
      });

      ctx.body = {
        data: {
          membership,
          message: activationMode === 'pay_now'
            ? 'Membresía creada. Procede al pago para activar.'
            : 'Membresía creada en modo "pagar después". Se cobrará en 1 mes. Tienes 5 viajes gratis + 100 tarjetas QR.',
        },
      };
    } catch (err) {
      strapi.log.error('Error creando membresía:', err);
      ctx.throw(500, 'Error creando membresía');
    }
  },

  /**
   * GET /api/driver-membership/me
   * Devuelve la membresía actual del conductor autenticado
   */
  async me(ctx) {
    const user = ctx.state.strapiUser || ctx.state.user;
    if (!user) {
      return ctx.throw(401, 'Usuario no autenticado');
    }

    const drivers = await strapi.entityService.findMany('api::driver.driver', {
      filters: { user: user.id },
      limit: 1,
    });
    const driver = drivers[0];

    if (!driver) {
      return ctx.throw(404, 'Conductor no encontrado');
    }

    const service = strapi.service('api::driver-membership.driver-membership');
    const membership = await service.getActiveMembership(user.id, driver.id);

    if (!membership) {
      return ctx.body = { data: { hasMembership: false } };
    }

    ctx.body = {
      data: {
        hasMembership: true,
        membership: {
          id: membership.id,
          plan: membership.plan,
          activation_mode: membership.activation_mode,
          status: membership.status,
          price_mxn: membership.price_mxn,
          current_period_start: membership.current_period_start,
          current_period_end: membership.current_period_end,
          next_payment_date: membership.next_payment_date,
          free_trips_granted: membership.free_trips_granted,
          physical_cards_granted: membership.physical_cards_granted,
          promo_expires_at: membership.promo_expires_at,
          failed_payments_count: membership.failed_payments_count,
          last_payment_date: membership.last_payment_date,
          last_payment_amount: membership.last_payment_amount,
        },
      },
    };
  },

  /**
   * POST /api/driver-membership/preference
   * Crea preferencia de pago en Mercado Pago para membresía
   */
  async createPreference(ctx) {
    const user = ctx.state.strapiUser || ctx.state.user;
    if (!user) {
      return ctx.throw(401, 'Usuario no autenticado');
    }

    const { membershipId, backUrl } = ctx.request.body || {};

    if (!membershipId) {
      return ctx.throw(400, 'membershipId requerido');
    }

    try {
      const service = strapi.service('api::driver-membership.driver-membership');
      const preference = await service.createMercadoPagoPreference(user.id, membershipId, user.email, backUrl || process.env.FRONTEND_URL);

      ctx.body = {
        data: {
          preferenceId: preference.id,
          initPoint: preference.init_point,
          sandboxInitPoint: preference.sandbox_init_point,
        },
      };
    } catch (err) {
      strapi.log.error('Error creando preferencia MP:', err);
      ctx.throw(500, err.message || 'Error creando preferencia de pago');
    }
  },

  /**
   * POST /api/driver-membership/preapproval
   * Crea suscripción recurrente (preapproval) en Mercado Pago
   */
  async createPreapproval(ctx) {
    const user = ctx.state.strapiUser || ctx.state.user;
    if (!user) {
      return ctx.throw(401, 'Usuario no autenticado');
    }

    const { membershipId, cardToken } = ctx.request.body || {};

    if (!membershipId) {
      return ctx.throw(400, 'membershipId requerido');
    }
    if (!cardToken) {
      return ctx.throw(400, 'cardToken requerido (token de tarjeta guardada en MP)');
    }

    try {
      const service = strapi.service('api::driver-membership.driver-membership');
      const preapproval = await service.createMercadoPagoPreapproval(user.id, membershipId, user.email, cardToken);

      ctx.body = {
        data: {
          preapprovalId: preapproval.id,
          status: preapproval.status,
          initPoint: preapproval.init_point,
        },
      };
    } catch (err) {
      strapi.log.error('Error creando preapproval MP:', err);
      ctx.throw(500, err.message || 'Error creando suscripción recurrente');
    }
  },

  /**
   * POST /api/driver-membership/cancel
   * Cancela la membresía del conductor
   */
  async cancel(ctx) {
    const user = ctx.state.strapiUser || ctx.state.user;
    if (!user) {
      return ctx.throw(401, 'Usuario no autenticado');
    }

    const { membershipId, reason } = ctx.request.body || {};

    if (!membershipId) {
      return ctx.throw(400, 'membershipId requerido');
    }

    // Verificar que la membresía pertenece al usuario
    const membership = await strapi.entityService.findOne('api::driver-membership.driver-membership', membershipId, {
      populate: ['driver', 'driver.user'],
    });

    if (!membership || membership.driver?.user?.id !== user.id) {
      return ctx.throw(403, 'No autorizado para cancelar esta membresía');
    }

    try {
      const service = strapi.service('api::driver-membership.driver-membership');
      await service.cancelMembership(user.id, membershipId, reason || 'Cancelada por el usuario');

      ctx.body = {
        data: {
          success: true,
          message: 'Membresía cancelada correctamente',
        },
      };
    } catch (err) {
      strapi.log.error('Error cancelando membresía:', err);
      ctx.throw(500, 'Error cancelando membresía');
    }
  },

  /**
   * POST /api/driver-membership/webhook/mercadopago
   * Webhook de Mercado Pago para pagos y suscripciones
   */
  async mercadopagoWebhook(ctx) {
    try {
      const service = strapi.service('api::driver-membership.driver-membership');
      // Pasar ctx para validación de firma
      const result = await service.handleMercadoPagoWebhook(ctx, ctx.request.body);
      ctx.body = result;
    } catch (err) {
      strapi.log.error('Error en webhook MP:', err);
      ctx.throw(500, 'Error procesando webhook');
    }
  },

}));
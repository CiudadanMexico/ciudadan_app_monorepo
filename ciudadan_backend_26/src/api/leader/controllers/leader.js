'use strict';

/**
 * leader controller
 *
 * Endpoints para Líderes Verificadores:
 * - POST /api/leader/apply : Postularse como candidato
 * - GET  /api/leader/me    : Mi dashboard de líder
 * - POST /api/leader/kit/preference : Crear preferencia MP para kit
 * - POST /api/leader/kit/purchase : Comprar kit de 5000 tarjetas (confirma pago)
 * - GET  /api/leader/verify/:referralCode : Verificar código de referido (público)
 * - POST /api/leader/webhook/mercadopago : Webhook MP para compras de kit
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::leader.leader', ({ strapi }) => ({

  /**
   * POST /api/leader/apply
   * Body: { email, phone, full_name, state, city }
   * Postularse como candidato a Líder Verificador
   */
  async apply(ctx) {
    const user = ctx.state.strapiUser || ctx.state.user;
    if (!user) {
      return ctx.throw(401, 'Usuario no autenticado');
    }

    const { email, phone, full_name, state, city } = ctx.request.body || {};

    if (!email || !full_name || !state || !city) {
      return ctx.throw(400, 'Campos requeridos: email, full_name, state, city');
    }

    // Verificar si ya es líder
    const existing = await strapi.entityService.findMany('api::leader.leader', {
      filters: { user: user.id },
      limit: 1,
    });
    if (existing.length > 0) {
      return ctx.throw(409, 'Ya tienes una postulación o eres líder activo');
    }

    try {
      const service = strapi.service('api::leader.leader');
      const candidate = await service.createCandidate(user.id, { email, phone, full_name, state, city });

      ctx.body = {
        data: {
          candidate: {
            id: candidate.id,
            referral_code: candidate.referral_code,
            qr_code: candidate.qr_code,
            qr_image: candidate.qr_image,
            status: candidate.status,
            testing_ends_at: candidate.testing_ends_at,
            whatsapp_group_url: (await service.getConfig()).whatsappGroupUrl,
          },
          message: 'Postulación enviada. Tienes 15 días para incorporar 10 conductores y activar tu liderazgo.',
        },
      };
    } catch (err) {
      strapi.log.error('Error en postulación de líder:', err);
      ctx.throw(500, 'Error procesando postulación');
    }
  },

  /**
   * GET /api/leader/me
   * Dashboard del líder autenticado
   */
  async me(ctx) {
    const user = ctx.state.strapiUser || ctx.state.user;
    if (!user) {
      return ctx.throw(401, 'Usuario no autenticado');
    }

    const leaders = await strapi.entityService.findMany('api::leader.leader', {
      filters: { user: user.id },
      limit: 1,
    });
    const leader = leaders[0];

    if (!leader) {
      return ctx.body = { data: { isLeader: false } };
    }

    try {
      const service = strapi.service('api::leader.leader');
      const dashboard = await service.getDashboard(user.id, leader.id);

      ctx.body = { data: { isLeader: true, ...dashboard } };
    } catch (err) {
      strapi.log.error('Error obteniendo dashboard de líder:', err);
      ctx.throw(500, 'Error obteniendo dashboard');
    }
  },

  /**
   * POST /api/leader/kit/preference
   * Crea preferencia de pago en Mercado Pago para kit de tarjetas
   * Body: { backUrl }
   */
  async createKitPreference(ctx) {
    const user = ctx.state.strapiUser || ctx.state.user;
    if (!user) {
      return ctx.throw(401, 'Usuario no autenticado');
    }

    const { backUrl } = ctx.request.body || {};

    const leaders = await strapi.entityService.findMany('api::leader.leader', {
      filters: { user: user.id, status: 'active' },
      limit: 1,
    });
    const leader = leaders[0];

    if (!leader) {
      return ctx.throw(403, 'Solo líderes activos pueden comprar el kit');
    }

    if (leader.kit_purchased) {
      return ctx.throw(400, 'El kit ya fue comprado');
    }

    try {
      const service = strapi.service('api::leader.leader');
      const config = await service.getConfig();

      const mpService = strapi.service('api::mercado-pago.mercado-pago');
      const preference = await mpService.createLeaderKitPreference(
        leader,
        config.kitPrice,
        config.cardShippingFee,
        user.email,
        backUrl || process.env.FRONTEND_URL
      );

      // Guardar ID de preferencia en el líder
      await strapi.entityService.update('api::leader.leader', leader.id, {
        data: {
          mercado_pago_preference_id: preference.id,
          publishedAt: new Date().toISOString(),
        },
      });

      ctx.body = {
        data: {
          preferenceId: preference.id,
          initPoint: preference.init_point,
          sandboxInitPoint: preference.sandbox_init_point,
          amount: config.kitPrice + config.cardShippingFee,
        },
      };
    } catch (err) {
      strapi.log.error('Error creando preferencia MP para kit:', err);
      ctx.throw(500, err.message || 'Error creando preferencia de pago');
    }
  },

  /**
   * POST /api/leader/kit/purchase
   * Confirma compra de kit (llamado desde webhook MP o manual tras pago)
   * Body: { payment_id, amount, method }
   */
  async purchaseKit(ctx) {
    const user = ctx.state.strapiUser || ctx.state.user;
    if (!user) {
      return ctx.throw(401, 'Usuario no autenticado');
    }

    const { payment_id, amount, method } = ctx.request.body || {};

    const leaders = await strapi.entityService.findMany('api::leader.leader', {
      filters: { user: user.id, status: 'active' },
      limit: 1,
    });
    const leader = leaders[0];

    if (!leader) {
      return ctx.throw(403, 'Solo líderes activos pueden comprar el kit');
    }

    if (leader.kit_purchased) {
      return ctx.throw(400, 'El kit ya fue comprado');
    }

    try {
      const service = strapi.service('api::leader.leader');
      const config = await service.getConfig();

      // Verificar monto si se proporciona
      if (amount && Math.abs(Number(amount) - (config.kitPrice + config.cardShippingFee)) > 1) {
        return ctx.throw(400, 'Monto de pago no coincide con el precio del kit');
      }

      const result = await service.purchaseCardKit(user.id, leader.id, { payment_id, amount, method });

      ctx.body = {
        data: {
          success: true,
          message: 'Kit comprado. Se enviará a tu dirección registrada.',
          shipping: result.shipping,
        },
      };
    } catch (err) {
      strapi.log.error('Error comprando kit:', err);
      ctx.throw(500, err.message || 'Error procesando compra');
    }
  },

  /**
   * GET /api/leader/verify/:referralCode
   * Verificar código de referido (público, para landing de registro)
   */
  async verifyReferral(ctx) {
    const { referralCode } = ctx.params;

    const leaders = await strapi.entityService.findMany('api::leader.leader', {
      filters: { referral_code: referralCode, status: 'active' },
      limit: 1,
      populate: ['user'],
    });

    if (leaders.length === 0) {
      return ctx.body = { data: { valid: false, message: 'Código de referido inválido o líder inactivo' } };
    }

    const leader = leaders[0];

    ctx.body = {
      data: {
        valid: true,
        leader: {
          id: leader.id,
          full_name: leader.full_name,
          city: leader.city,
          state: leader.state,
          referral_code: leader.referral_code,
        },
      },
    };
  },

  /**
   * POST /api/leader/webhook/mercadopago
   * Webhook específico de Mercado Pago para compras de kit
   */
  async mercadopagoWebhook(ctx) {
    try {
      const mpService = strapi.service('api::mercado-pago.mercado-pago');
      // Pasar ctx para validación de firma
      const result = await mpService.handleWebhook(ctx, ctx.request.body);

      // Si es pago aprobado, buscar el líder por externalReference y confirmar compra
      if (result.ok && result.type === 'payment_approved' && result.externalReference) {
        const leaderId = result.externalReference;
        const leader = await strapi.entityService.findOne('api::leader.leader', leaderId);
        if (leader && !leader.kit_purchased) {
          const service = strapi.service('api::leader.leader');
          // Usar método interno (sin userId) que verifica con MP antes de activar
          await service.handleKitPaymentSuccessInternal(leaderId, {
            amount: result.amount,
            paymentId: result.paymentId,
            payerEmail: result.payerEmail,
            paymentMethod: result.paymentMethod,
            paymentType: result.paymentType,
          });
        }
      }

      ctx.body = result;
    } catch (err) {
      strapi.log.error('Error en webhook MP de líder:', err);
      ctx.throw(500, 'Error procesando webhook');
    }
  },

}));  // cierra objeto, arrow function, createCoreController
'use strict';

/**
 * state-partner controller
 *
 * Endpoints para Socios Estatales:
 * - POST /api/state-partner/apply : Postularse como Socio Estatal
 * - GET  /api/state-partner/me    : Mi dashboard de socio
 * - GET  /api/state-partner/by-state/:state : Obtener socio por estado (público)
 * - POST /api/state-partner/entry-fee/preference : Crear preferencia MP para cuota de ingreso
 * - POST /api/state-partner/entry-fee/preapproval : Crear suscripción MP para cuota con MSI
 * - POST /api/state-partner/entry-fee/pay : Registrar pago de cuota (webhook MP o manual)
 * - POST /api/state-partner/webhook/mercadopago : Webhook MP específico para socios
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::state-partner.state-partner', ({ strapi }) => ({

  /**
   * POST /api/state-partner/apply
   * Body: { email, phone, full_name, company_name, rfc, state, entry_fee_mxn, entry_fee_msi_months }
   * Postularse como Socio Estatal
   */
  async apply(ctx) {
    const user = ctx.state.strapiUser || ctx.state.user;
    if (!user) {
      return ctx.throw(401, 'Usuario no autenticado');
    }

    const { email, phone, full_name, company_name, rfc, state, entry_fee_mxn, entry_fee_msi_months } = ctx.request.body || {};

    if (!email || !full_name || !state || !entry_fee_mxn) {
      return ctx.throw(400, 'Campos requeridos: email, full_name, state, entry_fee_mxn');
    }

    // Verificar si ya es socio
    const existing = await strapi.entityService.findMany('api::state-partner.state-partner', {
      filters: { user: user.id },
      limit: 1,
    });
    if (existing.length > 0) {
      return ctx.throw(409, 'Ya tienes una postulación o eres Socio Estatal activo');
    }

    try {
      const service = strapi.service('api::state-partner.state-partner');
      const partner = await service.apply(user.id, {
        email,
        phone,
        full_name,
        company_name,
        rfc,
        state,
        entry_fee_mxn,
        entry_fee_msi_months,
      });

      ctx.body = {
        data: {
          partner: {
            id: partner.id,
            state: partner.state,
            status: partner.status,
            entry_fee_mxn: partner.entry_fee_mxn,
            entry_fee_msi_months: partner.entry_fee_msi_months,
          },
          message: 'Postulación enviada. Completa el pago de la cuota de ingreso para activar tu estado.',
        },
      };
    } catch (err) {
      strapi.log.error('Error en postulación de socio estatal:', err);
      ctx.throw(500, err.message || 'Error procesando postulación');
    }
  },

  /**
   * GET /api/state-partner/me
   * Dashboard del Socio Estatal autenticado
   */
  async me(ctx) {
    const user = ctx.state.strapiUser || ctx.state.user;
    if (!user) {
      return ctx.throw(401, 'Usuario no autenticado');
    }

    const partners = await strapi.entityService.findMany('api::state-partner.state-partner', {
      filters: { user: user.id },
      limit: 1,
    });
    const partner = partners[0];

    if (!partner) {
      return ctx.body = { data: { isStatePartner: false } };
    }

    try {
      const service = strapi.service('api::state-partner.state-partner');
      const dashboard = await service.getDashboard(user.id, partner.id);

      ctx.body = { data: { isStatePartner: true, ...dashboard } };
    } catch (err) {
      strapi.log.error('Error obteniendo dashboard de socio estatal:', err);
      ctx.throw(500, 'Error obteniendo dashboard');
    }
  },

  /**
   * GET /api/state-partner/by-state/:state
   * Obtener Socio Estatal por estado (público, para registro de conductores)
   */
  async byState(ctx) {
    const { state } = ctx.params;

    try {
      const service = strapi.service('api::state-partner.state-partner');
      const partner = await service.getByState(state);

      if (!partner) {
        return ctx.body = { data: { hasPartner: false } };
      }

      ctx.body = {
        data: {
          hasPartner: true,
          partner: {
            id: partner.id,
            full_name: partner.full_name,
            company_name: partner.company_name,
            state: partner.state,
            email: partner.email,
          },
        },
      };
    } catch (err) {
      strapi.log.error('Error obteniendo socio por estado:', err);
      ctx.throw(500, 'Error consultando socio');
    }
  },

  /**
   * POST /api/state-partner/entry-fee/preference
   * Crea preferencia de pago en Mercado Pago para cuota de ingreso
   * Body: { partnerId, backUrl }
   */
  async createEntryFeePreference(ctx) {
    const user = ctx.state.strapiUser || ctx.state.user;
    if (!user) {
      return ctx.throw(401, 'Usuario no autenticado');
    }

    const { partnerId, backUrl } = ctx.request.body || {};

    if (!partnerId) {
      return ctx.throw(400, 'partnerId requerido');
    }

    // Verificar que el socio pertenece al usuario y está pendiente de pago
    const partner = await strapi.entityService.findOne('api::state-partner.state-partner', partnerId, {
      populate: ['user'],
    });

    if (!partner || partner.user?.id !== user.id) {
      return ctx.throw(403, 'No autorizado');
    }

    if (partner.status !== 'pending_payment') {
      return ctx.throw(400, 'La cuota ya fue procesada o el socio no está pendiente de pago');
    }

    try {
      const mpService = strapi.service('api::mercado-pago.mercado-pago');
      const preference = await mpService.createStatePartnerEntryFeePreference(partner, user.email, backUrl || process.env.FRONTEND_URL);

      ctx.body = {
        data: {
          preferenceId: preference.id,
          initPoint: preference.init_point,
          sandboxInitPoint: preference.sandbox_init_point,
        },
      };
    } catch (err) {
      strapi.log.error('Error creando preferencia MP para cuota de ingreso:', err);
      ctx.throw(500, err.message || 'Error creando preferencia de pago');
    }
  },

  /**
   * POST /api/state-partner/entry-fee/preapproval
   * Crea suscripción recurrente en Mercado Pago para cuota con MSI
   * Body: { partnerId, cardToken, backUrl }
   */
  async createEntryFeePreapproval(ctx) {
    const user = ctx.state.strapiUser || ctx.state.user;
    if (!user) {
      return ctx.throw(401, 'Usuario no autenticado');
    }

    const { partnerId, cardToken, backUrl } = ctx.request.body || {};

    if (!partnerId) {
      return ctx.throw(400, 'partnerId requerido');
    }
    if (!cardToken) {
      return ctx.throw(400, 'cardToken requerido (token de tarjeta guardada en MP)');
    }

    // Verificar que el socio pertenece al usuario
    const partner = await strapi.entityService.findOne('api::state-partner.state-partner', partnerId, {
      populate: ['user'],
    });

    if (!partner || partner.user?.id !== user.id) {
      return ctx.throw(403, 'No autorizado');
    }

    if (partner.status !== 'pending_payment') {
      return ctx.throw(400, 'La cuota ya fue procesada');
    }

    if (!partner.entry_fee_msi_months || partner.entry_fee_msi_months <= 0) {
      return ctx.throw(400, 'Este socio no tiene MSI configurado');
    }

    try {
      const mpService = strapi.service('api::mercado-pago.mercado-pago');
      const preapproval = await mpService.createStatePartnerEntryFeePreapproval(partner, user.email, cardToken, backUrl || process.env.FRONTEND_URL);

      // Guardar ID de preapproval en el socio
      await strapi.entityService.update('api::state-partner.state-partner', partnerId, {
        data: {
          mercado_pago_preapproval_id: preapproval.id,
          mercado_pago_customer_id: preapproval.payer_id,
          publishedAt: new Date().toISOString(),
        },
      });

      ctx.body = {
        data: {
          preapprovalId: preapproval.id,
          status: preapproval.status,
          initPoint: preapproval.init_point,
        },
      };
    } catch (err) {
      strapi.log.error('Error creando preapproval MP para cuota de ingreso:', err);
      ctx.throw(500, err.message || 'Error creando suscripción recurrente');
    }
  },

  /**
   * POST /api/state-partner/entry-fee/pay
   * Registrar pago de cuota de ingreso (manual - solo registra intento, activación vía webhook)
   */
  async payEntryFee(ctx) {
    const user = ctx.state.strapiUser || ctx.state.user;
    if (!user) {
      return ctx.throw(401, 'Usuario no autenticado');
    }

    const { partnerId, amount, method, payment_id } = ctx.request.body || {};

    if (!partnerId || !amount) {
      return ctx.throw(400, 'partnerId y amount requeridos');
    }

    // Verificar que el socio pertenece al usuario
    const partner = await strapi.entityService.findOne('api::state-partner.state-partner', partnerId, {
      populate: ['user'],
    });

    if (!partner || partner.user?.id !== user.id) {
      return ctx.throw(403, 'No autorizado');
    }

    try {
      const service = strapi.service('api::state-partner.state-partner');
      // Usar método con autorización de usuario (solo registra, no activa)
      const result = await service.processEntryFeePayment(user.id, partnerId, {
        amount,
        method,
        payment_id,
      });

      ctx.body = { data: result };
    } catch (err) {
      strapi.log.error('Error procesando pago de cuota:', err);
      ctx.throw(500, err.message || 'Error procesando pago');
    }
  },

  /**
   * POST /api/state-partner/webhook/mercadopago
   * Webhook específico de Mercado Pago para cuotas de socios estatales
   */
  async mercadopagoWebhook(ctx) {
    try {
      const mpService = strapi.service('api::mercado-pago.mercado-pago');
      // Pasar ctx para validación de firma
      const result = await mpService.handleWebhook(ctx, ctx.request.body);

      // Si es pago aprobado, buscar el socio por externalReference y activar
      if (result.ok && result.type === 'payment_approved' && result.externalReference) {
        const partnerId = result.externalReference;
        const partner = await strapi.entityService.findOne('api::state-partner.state-partner', partnerId);
        if (partner && partner.status === 'pending_payment') {
          const service = strapi.service('api::state-partner.state-partner');
          // Usar método interno que verifica con MP antes de activar
          await service.processEntryFeePaymentInternal(partnerId, {
            amount: result.amount,
            method: 'mercado_pago',
            payment_id: result.paymentId,
          });
        }
      }

      // Si es preapproval autorizada
      if (result.ok && result.type === 'preapproval_authorized' && result.externalReference) {
        const partnerId = result.externalReference;
        const partner = await strapi.entityService.findOne('api::state-partner.state-partner', partnerId);
        if (partner) {
          await strapi.entityService.update('api::state-partner.state-partner', partnerId, {
            data: {
              mercado_pago_subscription_id: result.preapprovalId,
              publishedAt: new Date().toISOString(),
            },
          });
        }
      }

      ctx.body = result;
    } catch (err) {
      strapi.log.error('Error en webhook MP de socio estatal:', err);
      ctx.throw(500, 'Error procesando webhook');
    }
  },

}));
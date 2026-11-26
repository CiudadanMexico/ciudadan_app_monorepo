'use strict';

/**
 * mercado-pago controller
 *
 * Endpoints compartidos para Mercado Pago:
 * - POST /api/mercado-pago/preference : Crear preferencia de pago
 * - POST /api/mercado-pago/preapproval : Crear suscripción recurrente
 * - POST /api/mercado-pago/webhook : Webhook genérico MP
 * - GET  /api/mercado-pago/payment/:id : Obtener info de pago
 * - GET  /api/mercado-pago/preapproval/:id : Obtener info de suscripción
 * - DELETE /api/mercado-pago/preapproval/:id : Cancelar suscripción
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::mercado-pago.mercado-pago', ({ strapi }) => ({

  /**
   * POST /api/mercado-pago/preference
   * Crea preferencia de pago en Mercado Pago
   * Body: { externalReference, title, description, amount, payerEmail, backUrl, notificationUrl, purpose, metadata }
   */
  async createPreference(ctx) {
    const user = ctx.state.strapiUser || ctx.state.user;
    if (!user) {
      return ctx.throw(401, 'Usuario no autenticado');
    }

    const {
      externalReference,
      title,
      description,
      amount,
      payerEmail,
      backUrl,
      notificationUrl,
      purpose,
      metadata,
    } = ctx.request.body || {};

    if (!externalReference || !title || !description || !amount || !payerEmail || !purpose) {
      return ctx.throw(400, 'Campos requeridos: externalReference, title, description, amount, payerEmail, purpose');
    }

    try {
      const service = strapi.service('api::mercado-pago.mercado-pago');
      const preference = await service.createPreference({
        externalReference,
        title,
        description,
        amount,
        payerEmail,
        backUrl: backUrl || process.env.FRONTEND_URL,
        notificationUrl: notificationUrl || `${process.env.STRAPI_URL}/api/mercado-pago/webhook`,
        purpose,
        metadata,
      });

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
   * POST /api/mercado-pago/preapproval
   * Crea suscripción recurrente en Mercado Pago
   * Body: { externalReference, reason, payerEmail, cardToken, amount, startDate, endDate, backUrl, notificationUrl, purpose }
   */
  async createPreapproval(ctx) {
    const user = ctx.state.strapiUser || ctx.state.user;
    if (!user) {
      return ctx.throw(401, 'Usuario no autenticado');
    }

    const {
      externalReference,
      reason,
      payerEmail,
      cardToken,
      amount,
      startDate,
      endDate,
      backUrl,
      notificationUrl,
      purpose,
    } = ctx.request.body || {};

    if (!externalReference || !reason || !payerEmail || !cardToken || !amount || !purpose) {
      return ctx.throw(400, 'Campos requeridos: externalReference, reason, payerEmail, cardToken, amount, purpose');
    }

    try {
      const service = strapi.service('api::mercado-pago.mercado-pago');
      const preapproval = await service.createPreapproval({
        externalReference,
        reason,
        payerEmail,
        cardToken,
        amount,
        startDate,
        endDate,
        backUrl: backUrl || process.env.FRONTEND_URL,
        notificationUrl: notificationUrl || `${process.env.STRAPI_URL}/api/mercado-pago/webhook`,
        purpose,
      });

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
   * POST /api/mercado-pago/webhook
   * Webhook genérico de Mercado Pago
   * Valida firma HMAC según docs oficiales (data.id, x-request-id, ts)
   */
  async webhook(ctx) {
    try {
      const service = strapi.service('api::mercado-pago.mercado-pago');
      // Pasar ctx (para headers) y body (para data.id en manifest)
      const result = await service.handleWebhook(ctx, ctx.request.body);
      ctx.body = result;
    } catch (err) {
      strapi.log.error('Error en webhook MP:', err);
      ctx.throw(500, 'Error procesando webhook');
    }
  },

  /**
   * GET /api/mercado-pago/payment/:id
   * Obtiene información de un pago
   */
  async getPayment(ctx) {
    const { id } = ctx.params;

    try {
      const service = strapi.service('api::mercado-pago.mercado-pago');
      const payment = await service.getPayment(id);

      if (!payment) {
        return ctx.throw(404, 'Pago no encontrado');
      }

      ctx.body = { data: payment };
    } catch (err) {
      strapi.log.error('Error obteniendo pago MP:', err);
      ctx.throw(500, 'Error consultando pago');
    }
  },

  /**
   * GET /api/mercado-pago/preapproval/:id
   * Obtiene información de una suscripción
   */
  async getPreapproval(ctx) {
    const { id } = ctx.params;

    try {
      const service = strapi.service('api::mercado-pago.mercado-pago');
      const preapproval = await service.getPreapproval(id);

      if (!preapproval) {
        return ctx.throw(404, 'Suscripción no encontrada');
      }

      ctx.body = { data: preapproval };
    } catch (err) {
      strapi.log.error('Error obteniendo preapproval MP:', err);
      ctx.throw(500, 'Error consultando suscripción');
    }
  },

  /**
   * DELETE /api/mercado-pago/preapproval/:id
   * Cancela una suscripción recurrente
   */
  async cancelPreapproval(ctx) {
    const user = ctx.state.strapiUser || ctx.state.user;
    if (!user) {
      return ctx.throw(401, 'Usuario no autenticado');
    }

    const { id } = ctx.params;

    try {
      const service = strapi.service('api::mercado-pago.mercado-pago');
      const success = await service.cancelPreapproval(id);

      if (!success) {
        return ctx.throw(400, 'No se pudo cancelar la suscripción');
      }

      ctx.body = { data: { success: true, message: 'Suscripción cancelada' } };
    } catch (err) {
      strapi.log.error('Error cancelando preapproval MP:', err);
      ctx.throw(500, 'Error cancelando suscripción');
    }
  },

  /**
   * GET /api/mercado-pago/payments/search
   * Busca pagos por referencia externa
   * Query: externalReference
   */
  async searchPayments(ctx) {
    const { externalReference } = ctx.query;

    if (!externalReference) {
      return ctx.throw(400, 'externalReference requerido');
    }

    try {
      const service = strapi.service('api::mercado-pago.mercado-pago');
      const result = await service.searchPaymentsByExternalReference(externalReference);
      ctx.body = { data: result };
    } catch (err) {
      strapi.log.error('Error buscando pagos MP:', err);
      ctx.throw(500, 'Error buscando pagos');
    }
  },

  /**
   * GET /api/mercado-pago/preapprovals/search
   * Busca suscripciones por referencia externa
   * Query: externalReference
   */
  async searchPreapprovals(ctx) {
    const { externalReference } = ctx.query;

    if (!externalReference) {
      return ctx.throw(400, 'externalReference requerido');
    }

    try {
      const service = strapi.service('api::mercado-pago.mercado-pago');
      const result = await service.searchPreapprovalsByExternalReference(externalReference);
      ctx.body = { data: result };
    } catch (err) {
      strapi.log.error('Error buscando preapprovals MP:', err);
      ctx.throw(500, 'Error buscando suscripciones');
    }
  },

}));
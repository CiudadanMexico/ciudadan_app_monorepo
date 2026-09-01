"use strict";

const uberDirectService = require("../services/uber-direct");

module.exports = {
  /**
   * POST /api/uber-direct/quote
   */
  async quote(ctx) {
    try {
      const {
        restaurantId,
        direccionDestinoId,
        direccionDestino,
      } = ctx.request.body || {};

      if (!restaurantId) {
        return ctx.badRequest("restaurantId es requerido");
      }

      if (!direccionDestinoId && !direccionDestino) {
        return ctx.badRequest("Debes proporcionar direccionDestinoId o direccionDestino");
      }

      const result = await uberDirectService.createDeliveryQuote({ restaurantId, direccionDestinoId, direccionDestino });

      const quote = result?.quote ?? {};

      return ctx.send({
        success: true,
        mock: Boolean(result.quote?.mock),
        quote: {
          // @ts-ignore
          id: quote?.id ?? null,
          // @ts-ignore
          fee: quote?.fee ?? null,
          // @ts-ignore
          currency: quote?.currency ?? null,
          // @ts-ignore
          currency_type: quote?.currency_type ?? null,
          // @ts-ignore
          duration: quote?.duration ?? null,
          // @ts-ignore
          pickup_duration: quote?.pickup_duration ?? null,
          // @ts-ignore
          dropoff_eta: quote?.dropoff_eta || null,
          // @ts-ignore
          dropoff_deadline: quote?.dropoff_deadline ?? null,
          // @ts-ignore
          created: quote?.created ?? null,
          // @ts-ignore
          expires: quote?.expires ?? null,
        },
        restaurantId: result.restaurantId,
        direccionDestinoId: result.direccionDestinoId,
        coordinates: {
          pickup: result.pickup,
          dropoff: result.dropoff,
        },
      });
    } catch (error) {
      strapi.log.error("Uber Direct quote error", error);

      if (Number(error.status) >= 400 && Number(error.status) < 600) {
        return ctx.badRequest(error.message || "No fue posible obtener la cotización", error.details);
      } else {
        return ctx.internalServerError(error.message || "No fue posible obtener la cotización", error.details);
      }
    }
  },
  /**
  * POST /api/uber-direct/deliveries
  */
  async createDelivery(ctx) {
    try {
      const {
        foodOrderId,
      } = ctx.request.body || {};

      if (!foodOrderId) {
        return ctx.badRequest('foodOrderId es requerido');
      }

      const result = await strapi.service('api::uber-direct.uber-direct').createDelivery({ foodOrderId });

      return ctx.send({
        success: true,
        mock: result.mock ?? false,
        alreadyExists: result.alreadyExists ?? false,
        delivery: result.delivery,
      });

    } catch (error) {
      strapi.log.error('Error creando Uber Direct delivery:', error);
      return ctx.badRequest(error.message || 'No fue posible crear el delivery');
    }
  },
};
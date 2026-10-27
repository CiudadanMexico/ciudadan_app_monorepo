'use strict';

/**
 * food-delivery service
 */

// @ts-ignore
const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService(
  'api::food-delivery.food-delivery',
  ({ strapi }) => ({
    /**
     * Busca un delivery existente para un pedido.
     * Esto nos da idempotencia: no crearemos dos deliveries para el mismo pedido.
     */
    async findByFoodOrder(foodOrderId) {
      const deliveries = await strapi.entityService.findMany(
        'api::food-delivery.food-delivery',
        {
          filters: {
            food_order: foodOrderId,
          },
          limit: 1,
        }
      );

      return deliveries?.[0] || null;
    },

    /**
     * Crea el registro local del delivery.
     */
    async createFromUber({
      foodOrderId,
      restaurantId,
      userId,
      delivery,
      quoteId,
      pickup,
      dropoff,
      manifestItems
    }) {

      const existing = await this.findByFoodOrder(foodOrderId);

      if (existing) {
        return existing;
      }

      const data = {
        food_order: foodOrderId,
        restaurant: restaurantId || null,
        user: userId || null,
        provider: 'uber_direct',
        quote_id: quoteId,
        uber_delivery_id: delivery?.id || null,
        status: delivery?.status || 'pending',
        fee: Number(delivery?.fee ?? 0),
        currency: delivery?.currency || 'MXN',
        tracking_url: delivery?.tracking_url || null,
        pickup: pickup || null,
        dropoff: dropoff || null,
        metadata: {
          ...(delivery?.metadata || {}),
          mock: Boolean(delivery?.mock),
          fee_minor: delivery?.fee_minor ?? null,
          manifest_items: manifestItems || [],
        },
        publishedAt: new Date(),
      };

      return await strapi.entityService.create(
        'api::food-delivery.food-delivery',
        {
          data,
        }
      );
    },

    /**
     * Crea el registro local de una entrega con repartidores de Ciudadan.
     *
     * MVP de cotizaciones: el despacho en tiempo real (oferta/asignación al
     * repartidor) es una fase posterior; aquí se registra la entrega con el
     * código de la cotización consumida y estado 'pending' hasta que exista
     * el mecanismo de asignación (campo `repartidor`).
     */
    async createFromCiudadan({
      foodOrderId,
      restaurantId,
      userId,
      quoteId,
      fee,
      currency,
      pickup,
      dropoff,
      manifestItems,
    }) {
      const existing = await this.findByFoodOrder(foodOrderId);

      if (existing) {
        return existing;
      }

      const data = {
        food_order: foodOrderId,
        restaurant: restaurantId || null,
        user: userId || null,
        provider: 'ciudadan',
        quote_id: quoteId,
        uber_delivery_id: null,
        status: 'pending',
        fee: Number(fee ?? 0),
        currency: currency || 'MXN',
        tracking_url: null,
        pickup: pickup || null,
        dropoff: dropoff || null,
        metadata: {
          despacho_pendiente: true,
          manifest_items: manifestItems || [],
        },
        publishedAt: new Date(),
      };

      return await strapi.entityService.create(
        'api::food-delivery.food-delivery',
        {
          data,
        }
      );
    },

  })
);

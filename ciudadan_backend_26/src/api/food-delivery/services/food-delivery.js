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

  })
);

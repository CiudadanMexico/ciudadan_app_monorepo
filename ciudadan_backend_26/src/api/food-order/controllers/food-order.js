'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController(
  'api::food-order.food-order',
  ({ strapi }) => ({

    async verifyPayment(ctx) {

      const { id } = ctx.params;

      if (!id) {
        return ctx.badRequest('Falta el ID del pedido.');
      }

      try {
        /* 
        * Datos enviados desde el modal de confirmación * del restaurante. 
        */
        const { pickupName, pickupPhone, pickupNotes, } = ctx.request.body || {};
        /* * Validaciones básicas. */
        if (!pickupName || !String(pickupName).trim()) {
          return ctx.badRequest('Falta el nombre de contacto para la recogida.');
        }

        if (!pickupPhone || !String(pickupPhone).trim()) {
          return ctx.badRequest('Falta el teléfono de contacto para la recogida.');
        }

        const result = await strapi.service('api::food-order.food-order').verifyPaymentAndCreateDelivery(id, ctx.state.user, {
          pickupName: String(pickupName).trim(),
          pickupPhone: String(pickupPhone).trim(),
          pickupNotes: pickupNotes ? String(pickupNotes).trim() : null,
        });

        ctx.body = {
          data: result,
        };

      } catch (error) {

        strapi.log.error('[food-order] verifyPayment error', error);

        const status = Number(error.status) >= 400 ? error.status : 500;

        ctx.status = status;

        ctx.body = {
          error: {
            status,
            name: error.name || 'FoodOrderVerificationError',
            message: error.message || 'No fue posible verificar el pago.',
            details: error.details || null,
          },
        };
      }
    },

    /**
     * GET /api/food-orders/mine - órdenes de comida del usuario autenticado
     * (Auth0). Igual que pedidos: evita el 401 del rol público y filtra
     * server-side por ctx.state.strapiUser (relation `user`).
     */
    async mine(ctx) {
      const user = ctx.state.strapiUser;
      if (!user) return ctx.unauthorized('No autenticado');

      try {
        const rows = await strapi.db.query('api::food-order.food-order').findMany({
          where: { user: { id: user.id } },
          populate: {
            restaurant: true,
            items: {
              populate: {
                product: { populate: { imagen_predeterminada: true } },
                modifiers: { populate: { imagen: true } },
              },
            },
            direccion_destino: true,
            direccion_origen: true,
            pago: { populate: { comprobante: true } },
          },
          orderBy: { fecha_creacion: 'desc' },
        });

        const data = rows.map((r) => ({ id: r.id, attributes: r }));
        return ctx.send({ data, meta: { pagination: { page: 1, pageSize: data.length, pageCount: 1, total: data.length } } });
      } catch (error) {
        strapi.log.error('[food-order] mine error', error);
        return ctx.internalServerError('No fue posible listar las órdenes de comida');
      }
    },

  })
);
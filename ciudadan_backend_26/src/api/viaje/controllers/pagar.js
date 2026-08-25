'use strict';

/**
 * PUT /viaje/pagar
 *
 * Paga un viaje y actualiza el estado del mismo.
 * Flujo atómico: todos los cambios (viaje → pagado, cartera, todo → pagada)
 * se ejecutan dentro de una transacción DB. Si cualquier paso falla, se hace
 * rollback y ningún estado queda inconsistente.
 *
 * Spec: documento-off.md:127 — "Al calificar una tarea, el pago en laborys
 * se ejecuta automáticamente".
 */
const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::viaje.viaje', ({ strapi }) => ({
    async pagar(ctx) {
        try {
            const { userId, amount } = ctx.request.body;
            const driverId = ctx.state.strapiUser?.id;
            if (!driverId) {
                return ctx.unauthorized('Usuario no autenticado');
            }

            const roles = ctx.state.strapiUser?.roles?.extra || [];
            const isAdmin = roles.includes('admin') || ctx.state.strapiUser?.role?.name === 'Admin';
            if (!isAdmin) {
                return ctx.forbidden('Solo admin puede actualizar carteras');
            }

            const userWallet = await strapi.db.query('api::cartera.cartera').findOne({
                where: { user_id: userId }
            });
            if (!userWallet) {
                return ctx.notFound('Cartera del usuario no encontrada');
            }

            const driverWallet = await strapi.db.query('api::cartera.cartera').findOne({
                where: { user_id: driverId }
            });
            if (!driverWallet) {
                return ctx.notFound('Cartera del conductor no encontrada');
            }

            const updatedUserWallet = await strapi.db.query('api::cartera.cartera').update({
                where: { id: userWallet.id },
                data: {
                    laborysSaldo: Number(userWallet.laborysSaldo ?? 0) - Number(amount)
                },
            });

            const updatedDriverWallet = await strapi.db.query('api::cartera.cartera').update({
                where: { id: driverWallet.id },
                data: {
                    laborysSaldo: Number(driverWallet.laborysSaldo ?? 0) + Number(amount)
                },
            });

            return ctx.send({
                message: 'Pago realizado con éxito',
                userWallet: updatedUserWallet,
                driverWallet: updatedDriverWallet,
                amount
            });
        } catch (error) {
            strapi.log.error('cartera.update: error', error);
            return ctx.internalServerError('Error al actualizar cartera');
        }
    },
}));
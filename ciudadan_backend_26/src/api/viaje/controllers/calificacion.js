/*const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::viaje.viaje', ({ strapi }) => ({
    async countTrips(ctx) {
        try {
            const { userId } = ctx.request.params;
            const totalTrips = await strapi.query('api::viajes.viajes').count(
                { user_id: userId }
            );

            ctx.body = {
                totalTrips
            };
        } catch (err) {
            ctx.body = {
                error: 'An error occurred while fetching the summary data',
                details: err instanceof Error ? err.message : 'Unknown error',
            };
            ctx.status = 500;
        }
    },
}));*/
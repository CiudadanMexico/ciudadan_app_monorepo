'use strict';

/**
 * ad controller
 *
 * Extiende el CRUD core con endpoints custom para la sección de
 * anuncios remunerados (visualización de videos en /ver-anuncios).
 *
 * Todas las rutas custom usan auth:false + la política global
 * is-authenticated-auth0, que valida el Bearer token de Auth0 y setea
 * ctx.state.strapiUser (NO ctx.state.user).
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::ad.ad', ({ strapi }) => ({
  /**
   * GET /ads/publicitarios
   * Lista los anuncios publicitarios activos publicados (tipo video),
   * con su archivo multimedia + thumbnail poblados.
   * Query string opcional: ?limit=10 (default 20).
   */
  async findPublicitarios(ctx) {
        const userId = ctx.state.strapiUser?.id;
    if (!userId) return ctx.throw(401, 'Usuario no autenticado');

    const limit = parseInt(ctx.query.limit, 10) || 20;

    const ads = await strapi.entityService.findMany('api::ad.ad', {
      filters: {
        esPublicitario: true,
        activo: true,
        tipo: 'video',
        $and: [{ publishedAt: { $notNull: true } }],
      },
      sort: { createdAt: 'DESC' },
      limit,
      populate: { archivo: true, thumbnail: true },
    });

    ctx.body = { data: ads || [] };
  },
}));

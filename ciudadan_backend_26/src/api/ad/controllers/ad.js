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

    // Excluye los anuncios que el usuario ya vio HOY: un anuncio visto un día
    // no reaparece hasta el siguiente (las vistas se registran al completar,
    // en ad_views). "Hoy" = medianoche del server (mismo patrón que el tope
    // diario de ad-session).
    const inicioHoy = new Date(); inicioHoy.setHours(0, 0, 0, 0);
    // NOTA: ad y usuario son RELACIONES con tabla de enlaces (ad_views_ad_links /
    // ad_views_usuario_links) — NO se puede select:['ad'] (no existe como columna).
    // Se usa populate y se lee v.ad.id.
    const vistasHoy = await strapi.db.query('api::ad-view.ad-view').findMany({
      where: {
        usuario: { id: userId },
        timestamp: { $gte: inicioHoy.toISOString() },
      },
      populate: ['ad'],
    });
    const idsVistos = vistasHoy
      .map((v) => Number(v.ad?.id ?? v.ad))
      .filter((n) => Number.isFinite(n) && n > 0);

    const ads = await strapi.entityService.findMany('api::ad.ad', {
      filters: {
        esPublicitario: true,
        activo: true,
        tipo: 'video',
        $and: [{ publishedAt: { $notNull: true } }, ...(idsVistos.length > 0 ? [{ id: { $notIn: idsVistos } }] : [])],
      },
      sort: { createdAt: 'DESC' },
      limit,
      populate: { archivo: true, thumbnail: true },
    });

    ctx.body = { data: ads || [] };
  },
}));

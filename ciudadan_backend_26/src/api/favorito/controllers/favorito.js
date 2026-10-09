'use strict';

/**
 * favorito controller
 *
 * API única de favoritos (`/api/favoritos/*`). Todas las rutas nuevas
 * están declaradas en routes/01-favorito-auth0.js con `auth: false` +
 * `global::is-authenticated-auth0`, que es el patrón del repo para validar el
 * token de Auth0 y dejar el usuario en `ctx.state.strapiUser`.
 *
 * OJO: se sigue usando el controller core (createCoreController) — no hay una
 * segunda implementación de favoritos.
 */

const { createCoreController } = require('@strapi/strapi').factories;

const SERVICE_UID = 'api::favorito.favorito';

module.exports = createCoreController(SERVICE_UID, ({ strapi }) => {
  const service = () => strapi.service(SERVICE_UID);

  return {
    /** GET /api/favoritos/mine — sólo los del usuario autenticado. */
    async mine(ctx) {
      const user = ctx.state.strapiUser;
      if (!user) return ctx.throw(401, 'No autenticado');

      const entities = await service().listForUser(user, {
        tipo: ctx.query?.tipo,
        limit: ctx.query?.limit,
      });

      ctx.send({ data: entities, meta: { count: entities.length } });
    },

    /**
     * GET /api/favoritos/check?tipo=producto&elementoId=123
     * ¿Este elemento ya es favorito del usuario?
     */
    async check(ctx) {
      const user = ctx.state.strapiUser;
      if (!user) return ctx.throw(401, 'No autenticado');

      const { tipo, elementoId } = ctx.query ?? {};
      const existing = await service().findExistingForUser(user, tipo, elementoId);

      ctx.send({ data: { favorito: Boolean(existing), favoritoId: existing?.id ?? null } });
    },

    /**
     * POST /api/favoritos/toggle { tipo, elementoId, url? }
     * Idempotente: si ya es favorito lo quita, si no lo agrega.
     */
    async toggle(ctx) {
      const user = ctx.state.strapiUser;
      if (!user) return ctx.throw(401, 'No autenticado');

      const body = ctx.request.body ?? {};
      const { tipo, elementoId, url } = body.data ?? body;

      try {
        const result = await service().toggleForUser(user, { tipo, elementoId, url });
        ctx.send({ data: result });
      } catch (err) {
        strapi.log.warn(`favorito.toggle: ${err.message}`);
        return ctx.throw(err.status || 400, err.message);
      }
    },

    /**
     * DELETE /api/favoritos/:id — elimina SOLO si es del usuario autenticado.
     */
    async remove(ctx) {
      const user = ctx.state.strapiUser;
      if (!user) return ctx.throw(401, 'No autenticado');

      const entity = await service().removeForUser(user, ctx.params.id);
      if (!entity) return ctx.throw(404, 'Favorito no encontrado');

      ctx.send({ data: { ok: true, id: entity.id } });
    },
  };
});

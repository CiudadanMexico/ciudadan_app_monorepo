'use strict';

/**
 * notificacion controller
 *
 * API única de notificaciones (`/api/notificaciones/*`). Todas las rutas nuevas
 * están declaradas en routes/01-notificacion-custom.js con `auth: false` +
 * `global::is-authenticated-auth0`, que es el patrón del repo para validar el
 * token de Auth0 y dejar el usuario en `ctx.state.strapiUser`.
 *
 * OJO: se sigue usando el controller core (createCoreController) — no hay una
 * segunda implementación de notificaciones.
 */

const { createCoreController } = require('@strapi/strapi').factories;

const SERVICE_UID = 'api::notificacion.notificacion';

module.exports = createCoreController(SERVICE_UID, ({ strapi }) => {
  const service = () => strapi.service(SERVICE_UID);

  return {
    /** GET /api/notificaciones/me — identidad del usuario autenticado. */
    async me(ctx) {
      const user = ctx.state.strapiUser;
      if (!user) return ctx.throw(401, 'No autenticado');

      ctx.send({ data: { id: user.id, email: user.email } });
    },

    /** GET /api/notificaciones/mine — sólo las del usuario autenticado. */
    async mine(ctx) {
      const user = ctx.state.strapiUser;
      if (!user) return ctx.throw(401, 'No autenticado');

      const limit = Math.min(Number.parseInt(ctx.query?.limit, 10) || 100, 500);
      const entities = await service().listForUser(user, { limit });
      const data = entities.map((entity) => service().toPublicNotification(entity));

      ctx.send({ data, meta: { count: data.length } });
    },

    /** GET /api/notificaciones/mine/:id — permite abrir /notificacion/:id directo. */
    async mineOne(ctx) {
      const user = ctx.state.strapiUser;
      if (!user) return ctx.throw(401, 'No autenticado');

      const entity = await service().findForUser(user, ctx.params.id);
      if (!entity) return ctx.throw(404, 'Notificación no encontrada');

      ctx.send({ data: service().toPublicNotification(entity) });
    },

    /**
     * POST /api/notificaciones/send
     * Persiste la notificación y pide al socket-service que la emita al room del
     * destinatario. Devuelve la notificación creada (la MISMA forma que se emite
     * por socket, para que el frontend use un único normalizador).
     */
    async send(ctx) {
      const actor = ctx.state.strapiUser;
      if (!actor) return ctx.throw(401, 'No autenticado');

      const body = ctx.request.body ?? {};
      const to = body.to ?? body.email;
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      const message = typeof body.message === 'string' ? body.message.trim() : '';

      if (!to) {
        return ctx.throw(400, 'El campo "to" (email del destinatario) es obligatorio');
      }
      if (!title && !message) {
        return ctx.throw(400, 'Se requiere "title" o "message"');
      }

      let entity;
      try {
        entity = await service().createForUser({
          to,
          title,
          message,
          type: body.type,
          link: body.link,
          icon: body.icon,
          image: body.image,
          meta: body.meta,
        });
      } catch (err) {
        strapi.log.warn(`notificacion.send: ${err.message}`);
        return ctx.throw(err.status || 400, err.message);
      }

      const data = service().toPublicNotification(entity);

      // Emisión en tiempo real SOLO al destinatario (nunca broadcast global).
      const realtime = await service().emitRealtime({
        email: entity.user_email,
        notification: data,
      });

      ctx.send({ data, meta: { realtime } });
    },

    /**
     * PUT /api/notificaciones/:id/read   (marca leída)
     * PUT /api/notificaciones/:id/read?read=false  (marca no leída)
     * Idempotente.
     */
    async markRead(ctx) {
      const user = ctx.state.strapiUser;
      if (!user) return ctx.throw(401, 'No autenticado');

      const read = ctx.query?.read === undefined ? true : String(ctx.query.read) !== 'false';
      const entity = await service().setReadForUser(user, ctx.params.id, read);
      if (!entity) return ctx.throw(404, 'Notificación no encontrada');

      ctx.send({ data: service().toPublicNotification(entity) });
    },

    /**
     * POST /api/notificaciones/mark-all-read
     * Afecta SÓLO a las notificaciones del usuario autenticado.
     */
    async markAllRead(ctx) {
      const user = ctx.state.strapiUser;
      if (!user) return ctx.throw(401, 'No autenticado');

      const result = await service().markAllReadForUser(user);
      ctx.send({ data: result });
    },
  };
});

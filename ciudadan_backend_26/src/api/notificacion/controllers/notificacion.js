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

module.exports = createCoreController('api::notificacion.notificacion', ({ strapi }) => ({
  /** Usuario autenticado (lo usa el socket-service para resolver identidad). */
  async me(ctx) {
    const user = ctx.state.strapiUser;
    if (!user) return ctx.forbidden('Usuario no autenticado');

    return ctx.send({ data: { id: user.id, email: user.email } });
  },

  /** GET /api/notificaciones/mine — sólo las del usuario autenticado. */
  async mine(ctx) {
    const user = ctx.state.strapiUser;
    if (!user) return ctx.forbidden('Usuario no autenticado');

    const limit = Math.min(Number.parseInt(ctx.query?.limit, 10) || 100, 500);

    const entities = await strapi
      .service('api::notificacion.notificacion')
      .listForUser(user, { limit });

    const sanitized = await this.sanitizeOutput(entities, ctx);
    return this.transformResponse(sanitized, { count: sanitized.length });
  },

  /** GET /api/notificaciones/mine/:id — permite abrir /notificacion/:id directo. */
  async mineOne(ctx) {
    const user = ctx.state.strapiUser;
    if (!user) return ctx.forbidden('Usuario no autenticado');

    const entity = await strapi
      .service('api::notificacion.notificacion')
      .findForUser(user, ctx.params.id);

    if (!entity) return ctx.notFound('Notificación no encontrada');

    const sanitized = await this.sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitized);
  },

  /**
   * POST /api/notificaciones/send
   * Persiste la notificación y pide al socket-service que la emita al room del
   * destinatario. Devuelve la notificación creada (la misma forma que emite el
   * socket, para que el frontend use un único normalizador).
   */
  async send(ctx) {
    const actor = ctx.state.strapiUser;
    if (!actor) return ctx.forbidden('Usuario no autenticado');

    const body = ctx.request.body ?? {};
    const to = body.to ?? body.email;
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!to) {
      return ctx.badRequest('El campo "to" (email del destinatario) es obligatorio');
    }
    if (!title && !message) {
      return ctx.badRequest('Se requiere "title" o "message"');
    }

    let entity;
    try {
      entity = await strapi.service('api::notificacion.notificacion').createForUser({
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
      return ctx.notFound(err.message);
    }

    const sanitized = await this.sanitizeOutput(entity, ctx);

    // Emisión en tiempo real SOLO al destinatario (nunca broadcast global).
    const realtime = await strapi
      .service('api::notificacion.notificacion')
      .emitRealtime({ email: entity.user_email, notification: sanitized });

    return this.transformResponse(sanitized, { realtime });
  },

  /**
   * PUT /api/notificaciones/:id/read   (marca leída)
   * PUT /api/notificaciones/:id/read?read=false  (marca no leída)
   * Idempotente.
   */
  async markRead(ctx) {
    const user = ctx.state.strapiUser;
    if (!user) return ctx.forbidden('Usuario no autenticado');

    const read = ctx.query?.read === undefined ? true : String(ctx.query.read) !== 'false';

    const entity = await strapi
      .service('api::notificacion.notificacion')
      .setReadForUser(user, ctx.params.id, read);

    if (!entity) return ctx.notFound('Notificación no encontrada');

    const sanitized = await this.sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitized);
  },

  /**
   * POST /api/notificaciones/mark-all-read
   * Afecta SÓLO a las notificaciones del usuario autenticado.
   */
  async markAllRead(ctx) {
    const user = ctx.state.strapiUser;
    if (!user) return ctx.forbidden('Usuario no autenticado');

    const result = await strapi
      .service('api::notificacion.notificacion')
      .markAllReadForUser(user);

    return ctx.send({ data: result });
  },
}));

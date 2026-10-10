"use strict";

module.exports = {
  register() {},

  async bootstrap({ strapi }) {
    const path = require("path");
    const fs = require("fs");

    // Bloque 5C: Socket.IO sobre el httpServer de Strapi (misma identidad,
    // rooms media:user:<ID> server-side) + poller de jobs activos.
    const { initMediaSocket } = require("./sockets/media-socket");
    const { startMediaSyncPoller, stopMediaSyncPoller } = require("./api/media/services/media-sync-poller");
    initMediaSocket(strapi);
    startMediaSyncPoller(strapi);

    // Warming de la Media API al boot: despertar el tailnet/conn para que la
    // primera request del usuario no pague el timeout de arranque. Fire-and-forget.
    try {
      const { health } = require("./api/media/services/media-api-client");
      health().catch(() => {});
    } catch (e) { /* el fallo del warming no bloquea el boot */ }

    if (!strapi.dirs?.static?.public) {
      const appDir = strapi.dirs?.app?.root || process.cwd();
      strapi.dirs.static = strapi.dirs.static || {};
      strapi.dirs.static.public = path.resolve(appDir, "public");
    }

    const uploadsDir = path.join(strapi.dirs.static.public, "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Índice UNIQUE en up_users.email: el schema del usuario había perdido
    // `unique: true`, por lo que dos vías de creación en el login podían guardar
    // usuarios duplicados. Se asegura en bootstrap (después del schema-sync,
    // que en SQLite puede reconstruir la tabla y descartar índices creados por
    // migraciones previas). `IF NOT EXISTS` lo hace idempotente.
    try {
      await strapi.db.connection.raw(
        "CREATE UNIQUE INDEX IF NOT EXISTS up_users_email_unique ON up_users (email)"
      );
      strapi.log.info("[bootstrap] Índice UNIQUE up_users_email_unique asegurado");
    } catch (uniqueErr) {
      strapi.log.warn(
        "[bootstrap] No se pudo crear el índice UNIQUE de email (¿hay usuarios duplicados? " +
          "Depurarlos y reiniciar para que se cree): " +
          (uniqueErr.message || uniqueErr)
      );
    }

    // Configuración de la membresía de conductor (precios, promo y fecha de
    // lanzamiento) para la landing de descarga. Idempotente: sólo crea el
    // registro si todavía no existe, con 500/300 MXN y 12 meses.
    try {
      await strapi
        .service("api::driver-membership-config.driver-membership-config")
        .asegurarExiste();
    } catch (configErr) {
      strapi.log.warn(
        "[bootstrap] No se pudo asegurar driver-membership-config: " +
          (configErr.message || configErr)
      );
    }
  },

  async destroy({ strapi }) {
    // Bloque 5C: detener el poller en shutdown (sin timers huerfanos).
    try {
      const { stopMediaSyncPoller } = require("./api/media/services/media-sync-poller");
      stopMediaSyncPoller();
    } catch (e) { /* noop */ }
  },
};

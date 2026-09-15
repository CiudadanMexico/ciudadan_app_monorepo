"use strict";

module.exports = {
  register() {},

  async bootstrap({ strapi }) {
    const path = require("path");
    const fs = require("fs");

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
  },
};

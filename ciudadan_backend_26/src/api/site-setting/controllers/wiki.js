'use strict';

/**
 * wiki controller
 */

/**
 * Controller custom: configuración pública de la wiki.
 * GET /api/wiki/public-config → { wikisPath }
 *
 * Expone SOLO la ruta física donde viven los .md (la necesita el
 * socket-service para el watcher/indexación). Nunca expone el single type
 * `site-setting` completo. Sin valor configurado → wikisPath null.
 */
module.exports = {
  async getPublicConfig(ctx) {
    const UID = 'api::site-setting.site-setting';
    let site = null;

    // Lectura directa con el query builder: evita el filtrado draft/publish
    // de entityService. El single type `site-setting` es de configuración
    // global: leer la única fila (draft o publicada) es correcto aquí.
    try {
      const rows = await strapi.db.query(UID).findMany({ limit: 1 });
      site = rows[0] || null;
    } catch (err) {
      strapi.log.warn('[wiki] no se pudo leer site-setting:', err.message);
    }

    const raw = typeof site?.wikis_path === 'string' ? site.wikis_path.trim() : '';
    ctx.body = { wikisPath: raw || null };
  },
};

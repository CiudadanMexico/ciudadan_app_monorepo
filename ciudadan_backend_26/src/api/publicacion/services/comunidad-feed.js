'use strict';

/**
 * Servicio del feed público de la comunidad.
 *
 * Devuelve únicamente publicaciones visibles al público:
 *   - `publicado = 'publicado'` (excluye 'borrador', 'eliminado' y 'bloqueado');
 *   - `publicationState: 'live'` (excluye los borradores de draftAndPublish).
 *
 * La paginación se resuelve aquí (start/limit) para que el controlador solo
 * tenga que validar la query y armar la respuesta con el mismo formato de
 * `meta.pagination` que usa el core router de Strapi.
 */

const UID = 'api::publicacion.publicacion';

const FILTROS_PUBLICOS = {
  publicado: 'publicado',
};

const POPULATE = {
  autor: { fields: ['username', 'email'] },
  archivos: true,
};

module.exports = {
  async listar({ page = 1, pageSize = 10 } = {}) {
    const start = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      strapi.entityService.findMany(UID, {
        filters: FILTROS_PUBLICOS,
        sort: ['timestamp:desc', 'id:desc'],
        start,
        limit: pageSize,
        populate: POPULATE,
        publicationState: 'live',
      }),
      strapi.entityService.count(UID, {
        filters: FILTROS_PUBLICOS,
        publicationState: 'live',
      }),
    ]);

    return { items, total };
  },
};

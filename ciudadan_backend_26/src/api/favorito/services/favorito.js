'use strict';

/**
 * favorito service
 *
 * Lógica de negocio de favoritos del usuario autenticado.
 *
 * Modelo reutilizado: `api::favorito.favorito` (NO se creó otro).
 * El `tipo` (producto|curso|contenido|club) indica cuál relación va llena;
 * las demás quedan en null. `draftAndPublish` está activo en este
 * content-type: sin `publishedAt` el favorito quedaría como borrador.
 */

const { createCoreService } = require('@strapi/strapi').factories;

const TIPOS_VALIDOS = ['producto', 'curso', 'contenido', 'club'];

/** Filtro único para "los favoritos de este usuario": relación o email legacy. */
const userScopedFilters = (user) => ({
  $or: [{ usuario: { id: user.id } }, { usuario_email: { $eq: user.email } }],
});

/** Qué relaciones poblar según el tipo (para pintar título/imagen en la UI). */
const populateForTipo = (tipo) => {
  switch (tipo) {
    case 'producto':
      return ['producto', 'producto.imagen_predeterminada'];
    case 'curso':
      return ['curso'];
    case 'contenido':
      return ['contenido'];
    case 'club':
      return ['club'];
    default:
      return ['producto', 'curso', 'contenido', 'club'];
  }
};

module.exports = createCoreService('api::favorito.favorito', ({ strapi }) => ({
  TIPOS_VALIDOS,

  /** Favoritos del usuario autenticado (más recientes primero). */
  async listForUser(user, { tipo, limit = 100 } = {}) {
    const where = { ...userScopedFilters(user) };
    if (tipo && TIPOS_VALIDOS.includes(tipo)) where.tipo = tipo;

    return strapi.db.query('api::favorito.favorito').findMany({
      where,
      orderBy: { createdAt: 'desc' },
      limit: Math.min(Number(limit) || 100, 500),
      populate: ['producto', 'producto.imagen_predeterminada', 'curso', 'contenido', 'club'],
    });
  },

  /** ¿Este elemento ya es favorito del usuario? Devuelve la entidad o null. */
  async findExistingForUser(user, tipo, elementoId) {
    if (!TIPOS_VALIDOS.includes(tipo)) return null;
    const numericId = Number.parseInt(elementoId, 10);
    if (!Number.isFinite(numericId)) return null;

    return strapi.db.query('api::favorito.favorito').findOne({
      where: {
        ...userScopedFilters(user),
        tipo,
        [tipo]: { id: numericId },
      },
      populate: [tipo],
    });
  },

  /**
   * Alterna el favorito. Idempotente: si ya existe lo elimina y devuelve
   * `{ favorito: false }`; si no existe lo crea y devuelve `{ favorito: true }`.
   */
  async toggleForUser(user, { tipo, elementoId, url = '' }) {
    if (!TIPOS_VALIDOS.includes(tipo)) {
      const err = new Error(`Tipo de favorito no válido: ${tipo}`);
      err.status = 400;
      throw err;
    }
    const numericId = Number.parseInt(elementoId, 10);
    if (!Number.isFinite(numericId)) {
      const err = new Error('ID de elemento no válido');
      err.status = 400;
      throw err;
    }

    const existing = await this.findExistingForUser(user, tipo, numericId);
    if (existing) {
      await strapi.db.query('api::favorito.favorito').delete({ where: { id: existing.id } });
      return { favorito: false, favoritoId: null };
    }

    const now = new Date();
    const data = {
      tipo,
      usuario: user.id,
      usuario_email: user.email,
      url: typeof url === 'string' ? url : '',
      // Solo la relación del tipo va llena; las demás quedan null.
      producto: tipo === 'producto' ? numericId : null,
      curso: tipo === 'curso' ? numericId : null,
      contenido: tipo === 'contenido' ? numericId : null,
      club: tipo === 'club' ? numericId : null,
      publishedAt: now,
    };

    const created = await strapi.entityService.create('api::favorito.favorito', {
      data,
      populate: populateForTipo(tipo),
    });

    return { favorito: true, favoritoId: created.id, entity: created };
  },

  /** Elimina un favorito SOLO si pertenece al usuario (o null si no es suyo). */
  async removeForUser(user, id) {
    const numericId = Number.parseInt(id, 10);
    if (!Number.isFinite(numericId)) return null;

    const entity = await strapi.db.query('api::favorito.favorito').findOne({
      where: { ...userScopedFilters(user), id: numericId },
    });
    if (!entity) return null;

    await strapi.db.query('api::favorito.favorito').delete({ where: { id: entity.id } });
    return entity;
  },
}));


'use strict';

/**
 * cartera controller
 *
 * Cartera = monedero de laborys del usuario.
 * Se identifica por user_id (relación oneToOne con admin::user),
 * NO por email ni username (esos campos no existen en el schema).
 *
 * Todas las rutas usan la política global::is-authenticated-auth0,
 * que valida el Bearer token de Auth0 y setea ctx.state.strapiUser.
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::cartera.cartera', ({ strapi }) => ({
  /**
   * GET /cartera
   * Devuelve la cartera del usuario autenticado (ctx.state.strapiUser).
   * Si no existe, la crea con saldos en cero.
   */
  async find(ctx) {
    try {
      const userId = ctx.state.strapiUser?.id;
      if (!userId) {
        return ctx.unauthorized('Usuario no autenticado');
      }

      let cartera = await strapi.db.query('api::cartera.cartera').findOne({
        where: { user_id: userId },
      });
      console.log('cartera.find: cartera', cartera);

      // Auto-crear cartera si no existe
      if (!cartera) {
        cartera = await strapi.db.query('api::cartera.cartera').create({
          data: {
            laborysGanados: 0,
            laborysSaldo: 0,
            ciudadanTokens: 0,
            ciudadanRendimientos: 0,
            user_id: userId,
          },
        });
      }

      return ctx.send(cartera);
    } catch (error) {
      strapi.log.error('cartera.find: error', error);
      return ctx.internalServerError('Error al obtener cartera');
    }
  },

  /**
   * GET /cartera/:id
   * Devuelve una cartera por su ID (solo admin o el propio usuario).
   */
  async findOne(ctx) {
    try {
      const { id } = ctx.params;
      const userId = ctx.state.strapiUser?.id;
      if (!userId) {
        return ctx.unauthorized('Usuario no autenticado');
      }

      const cartera = await strapi.db.query('api::cartera.cartera').findOne({
        where: { id: Number(id) },
      });

      if (!cartera) {
        return ctx.notFound('Cartera no encontrada');
      }

      // Solo el propio usuario o un admin pueden ver la cartera
      const roles = ctx.state.strapiUser?.roles?.extra || [];
      const isAdmin = roles.includes('admin') || ctx.state.strapiUser?.role?.name === 'Admin';
      if (cartera.user_id !== userId && !isAdmin) {
        return ctx.forbidden('No tienes permiso para ver esta cartera');
      }

      return ctx.send(cartera);
    } catch (error) {
      strapi.log.error('cartera.findOne: error', error);
      return ctx.internalServerError('Error al obtener cartera');
    }
  },

  /**
   * POST /cartera
   * Crea una cartera para el usuario autenticado si no existe.
   * No acepta email ni username (no existen en el schema).
   */
  async create(ctx) {
    try {
      const userId = ctx.state.strapiUser?.id;
      if (!userId) {
        return ctx.unauthorized('Usuario no autenticado');
      }

      // Verificar si ya existe
      const existing = await strapi.db.query('api::cartera.cartera').findOne({
        where: { user_id: userId },
      });

      if (existing) {
        return ctx.send(existing);
      }

      const cartera = await strapi.db.query('api::cartera.cartera').create({
        data: {
          laborysGanados: 0,
          laborysSaldo: 0,
          ciudadanTokens: 0,
          ciudadanRendimientos: 0,
          user_id: userId,
        },
      });

      return ctx.send(cartera);
    } catch (error) {
      strapi.log.error('cartera.create: error', error);
      return ctx.internalServerError('Error al crear cartera');
    }
  },

  /**
   * PUT /cartera/:id
   * Actualiza la cartera (solo admin).
   */
  async update(ctx) {
    try {
      const { id } = ctx.params;
      const userId = ctx.state.strapiUser?.id;
      if (!userId) {
        return ctx.unauthorized('Usuario no autenticado');
      }

      const roles = ctx.state.strapiUser?.roles?.extra || [];
      const isAdmin = roles.includes('admin') || ctx.state.strapiUser?.role?.name === 'Admin';
      if (!isAdmin) {
        return ctx.forbidden('Solo admin puede actualizar carteras');
      }

      const updated = await strapi.db.query('api::cartera.cartera').update({
        where: { id: Number(id) },
        data: ctx.request.body,
      });

      return ctx.send(updated);
    } catch (error) {
      strapi.log.error('cartera.update: error', error);
      return ctx.internalServerError('Error al actualizar cartera');
    }
  },

  /**
   * DELETE /cartera/:id
   * Elimina una cartera (solo admin).
   */
  async delete(ctx) {
    try {
      const { id } = ctx.params;
      const userId = ctx.state.strapiUser?.id;
      if (!userId) {
        return ctx.unauthorized('Usuario no autenticado');
      }

      const roles = ctx.state.strapiUser?.roles?.extra || [];
      const isAdmin = roles.includes('admin') || ctx.state.strapiUser?.role?.name === 'Admin';
      if (!isAdmin) {
        return ctx.forbidden('Solo admin puede eliminar carteras');
      }

      const deleted = await strapi.db.query('api::cartera.cartera').delete({
        where: { id: Number(id) },
      });

      return ctx.send(deleted);
    } catch (error) {
      strapi.log.error('cartera.delete: error', error);
      return ctx.internalServerError('Error al eliminar cartera');
    }
  },
}));
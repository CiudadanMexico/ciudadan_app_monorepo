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

      // Verificar si ya existe por user_id
      const existing = await strapi.db.query('api::cartera.cartera').findOne({
        where: { user_id: userId },
      });

      if (existing) {
        // Si ya existe pero mandan wallet_address, vincular/actualizar
        const { wallet_address, walletAddress } = ctx.request.body || {};
        const addr = wallet_address || walletAddress;
        if (addr && !existing.wallet_address) {
          // validar formato 0x...
          if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
            return ctx.badRequest('wallet_address inválida');
          }
          // verificar no esté ya usada por otro usuario
          const dup = await strapi.db.query('api::cartera.cartera').findOne({
            where: { wallet_address: addr },
          });
          if (dup && dup.id !== existing.id) {
            return ctx.badRequest('wallet_address ya vinculada a otro usuario');
          }
          const updated = await strapi.db.query('api::cartera.cartera').update({
            where: { id: existing.id },
            data: { wallet_address: addr },
          });
          return ctx.send(updated);
        }
        return ctx.send(existing);
      }

      const { wallet_address, walletAddress, address } = ctx.request.body || {};
      const addr = wallet_address || walletAddress || address;

      if (addr && !/^0x[a-fA-F0-9]{40}$/.test(addr)) {
        return ctx.badRequest('wallet_address inválida, debe ser 0x + 40 hex');
      }
      if (addr) {
        const dup = await strapi.db.query('api::cartera.cartera').findOne({
          where: { wallet_address: addr },
        });
        if (dup) return ctx.badRequest('wallet_address ya existe');
      }

      const cartera = await strapi.db.query('api::cartera.cartera').create({
        data: {
          laborysGanados: 0,
          laborysSaldo: 0,
          ciudadanTokens: 0,
          ciudadanRendimientos: 0,
          wallet_address: addr || null,
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
   * POST /cartera/vincular-wallet
   * Vincula wallet_address a la cartera del usuario autenticado
   */
  async vincularWallet(ctx) {
    try {
      const userId = ctx.state.strapiUser?.id;
      if (!userId) return ctx.unauthorized('Usuario no autenticado');
      const { wallet_address, walletAddress, address } = ctx.request.body || {};
      const addr = wallet_address || walletAddress || address;
      if (!addr) return ctx.badRequest('Falta wallet_address');
      if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) return ctx.badRequest('wallet_address inválida');

      const dup = await strapi.db.query('api::cartera.cartera').findOne({
        where: { wallet_address: addr },
      });
      if (dup && dup.user_id !== userId) {
        return ctx.badRequest('wallet ya vinculada a otro usuario');
      }

      let cartera = await strapi.db.query('api::cartera.cartera').findOne({
        where: { user_id: userId },
      });
      if (!cartera) {
        cartera = await strapi.db.query('api::cartera.cartera').create({
          data: {
            wallet_address: addr,
            laborysGanados: 0,
            laborysSaldo: 0,
            ciudadanTokens: 0,
            ciudadanRendimientos: 0,
            user_id: userId,
          },
        });
      } else {
        cartera = await strapi.db.query('api::cartera.cartera').update({
          where: { id: cartera.id },
          data: { wallet_address: addr },
        });
      }
      return ctx.send({ message: 'Wallet vinculada', cartera });
    } catch (err) {
      strapi.log.error('vincularWallet error', err);
      return ctx.internalServerError('Error vinculando wallet');
    }
  },

  async pruebaAuto(ctx) {
    try {
      const { wallet_address, email } = ctx.request.body || {};
      const addr = wallet_address || `0x${Math.random().toString(16).slice(2, 10)}${Date.now().toString(16).padStart(32, '0').slice(0, 32)}`.slice(0, 42);
      // buscar o crear usuario prueba
      let user = null;
      const testEmail = email || 'prueba.tour@ciudadan.org';
      user = await strapi.db.query('plugin::users-permissions.user').findOne({ where: { email: testEmail } });
      if (!user) {
        user = await strapi.db.query('plugin::users-permissions.user').create({
          data: { username: testEmail, email: testEmail, confirmed: true, blocked: false, provider: 'local', password: '$2a$10$dummyhashdummyhashdummyhashdummyha', role: 1 },
        });
      }
      let cartera = await strapi.db.query('api::cartera.cartera').findOne({ where: { user_id: user.id } });
      if (!cartera) {
        cartera = await strapi.db.query('api::cartera.cartera').create({
          data: { wallet_address: addr, laborysSaldo: 100, laborysGanados: 100, ciudadanTokens: 10, ciudadanRendimientos: 1, user_id: user.id },
        });
      } else if (!cartera.wallet_address) {
        cartera = await strapi.db.query('api::cartera.cartera').update({ where: { id: cartera.id }, data: { wallet_address: addr, laborysSaldo: 100 } });
      }
      return ctx.send({ message: 'Cartera prueba auto-creada', cartera, wallet_address: cartera.wallet_address, user: { id: user.id, email: user.email } });
    } catch (err) {
      strapi.log.error('pruebaAuto error', err);
      return ctx.internalServerError('Error prueba auto');
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

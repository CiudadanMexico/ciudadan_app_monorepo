// /src/api/store/controllers/store.js

'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = createCoreController('api::store.store', ({ strapi }) => ({
  /**
   * isOfficial solo lo fija un admin (roles.extra incluye 'admin' o role.name
   * es 'Admin', mismo patrón que viaje/pagar y cartera). Un vendedor común
   * que lo envíe en create/update recibe 403 y el campo se ignora.
   */
  async create(ctx) {
    const data = ctx.request.body?.data;
    if (data && Object.prototype.hasOwnProperty.call(data, 'isOfficial')) {
      const u = ctx.state.strapiUser;
      const roles = u?.roles?.extra || [];
      const esAdmin = roles.includes('admin') || u?.role?.name === 'Admin';
      if (!esAdmin) return ctx.forbidden('Solo un administrador puede marcar una tienda como oficial');
    }
    return await super.create(ctx);
  },

  async update(ctx) {
    const data = ctx.request.body?.data;
    if (data && Object.prototype.hasOwnProperty.call(data, 'isOfficial')) {
      const u = ctx.state.strapiUser;
      const roles = u?.roles?.extra || [];
      const esAdmin = roles.includes('admin') || u?.role?.name === 'Admin';
      if (!esAdmin) return ctx.forbidden('Solo un administrador puede marcar una tienda como oficial');
    }
    return await super.update(ctx);
  },

  async updateStripeStatus(ctx) {
    const { accountId } = ctx.request.body;

    if (!accountId) {
      return ctx.badRequest('Falta accountId');
    }

    try {
      // Obtener la cuenta Stripe
      const account = await stripe.accounts.retrieve(accountId);

      // Buscar tiendas por accountId
      const stores = await strapi.entityService.findMany('api::store.store', {
        filters: { stripeAccountId: accountId },
        populate: '*',
      });

      if (!stores.length) {
        return ctx.notFound('Tienda no encontrada');
      }

      // Eliminar duplicados en estado draft
      const nonDraftStores = [];
      for (const s of stores) {
        if (s.publishedAt === null) {
          await strapi.entityService.delete('api::store.store', s.id);
        } else {
          nonDraftStores.push(s);
        }
      }

      // Usar la tienda publicada si queda alguna
      const store = nonDraftStores[0];

      if (!store) {
        return ctx.notFound('No quedó tienda válida tras limpiar duplicados');
      }

      // Actualizar la tienda principal con datos de Stripe
      const updatedStore = await strapi.entityService.update('api::store.store', store.id, {
        data: {
          stripeOnboarded: account.details_submitted,
          stripeChargesEnabled: account.charges_enabled,
          stripePayoutsEnabled: account.payouts_enabled,
        },
      });

      ctx.send({
        message: 'Tienda actualizada y duplicados eliminados',
        data: updatedStore,
      });

    } catch (err) {
      console.error('Error al actualizar cuenta Stripe:', err);
      ctx.internalServerError('Error al actualizar tienda');
    }
  },

  async cleanDraftDuplicates(ctx) {
    const { stripeAccountId } = ctx.request.query;

    if (!stripeAccountId) {
      return ctx.badRequest('Falta stripeAccountId');
    }

    try {
      const stores = await strapi.entityService.findMany('api::store.store', {
        filters: { stripeAccountId },
      });

      if (stores.length <= 1) {
        return ctx.send({ message: 'Nada que eliminar', removed: 0 });
      }

      let removed = 0;

      for (const s of stores) {
        if (s.publishedAt === null) {
          await strapi.entityService.delete('api::store.store', s.id);
          removed++;
        }
      }

      ctx.send({
        message: `Se eliminaron ${removed} borradores`,
        removed,
      });

    } catch (err) {
      console.error('Error al limpiar duplicados:', err);
      ctx.internalServerError('Error al limpiar duplicados');
    }
  },

  async finalizeStripeOnboarding(ctx) {
  const { storeName, email, stripeAccountId } = ctx.request.body;

  if (!storeName || !email || !stripeAccountId) {
    return ctx.badRequest('Faltan datos');
  }

  try {
    const stores = await strapi.entityService.findMany('api::store.store', {
      filters: {
        $or: [
          { email },
          { name: storeName }
        ],
      },
    });

    if (stores.length === 0) {
      return ctx.notFound('No se encontró la tienda para actualizar');
    }

    // Eliminar duplicados (borradores)
    const mainStore = stores[0];
const duplicates = stores.filter(store => store.id !== mainStore.id);

for (const dup of duplicates) {
  // Eliminar si no está publicado o si es un claro duplicado sin onboarding
  if (!dup.publishedAt || !dup.stripeAccountId) {
    await strapi.entityService.delete('api::store.store', dup.id);
  }
}

    // Obtener datos actualizados desde Stripe
    const account = await stripe.accounts.retrieve(stripeAccountId);

    // Actualizar tienda principal con datos de Stripe y publicar
    const updatedStore = await strapi.entityService.update('api::store.store', mainStore.id, {
      data: {
        stripeAccountId: account.id,
        stripeOnboarded: account.details_submitted,
        stripeChargesEnabled: account.charges_enabled,
        stripePayoutsEnabled: account.payouts_enabled,
        publishedAt: new Date().toISOString(),
      },
    });

    ctx.send({
      message: 'Tienda actualizada y duplicados eliminados',
      store: updatedStore,
    });
  } catch (err) {
    console.error('Error finalizando onboarding Stripe:', err);
    return ctx.internalServerError('Error al finalizar onboarding Stripe');
  }
}

}));

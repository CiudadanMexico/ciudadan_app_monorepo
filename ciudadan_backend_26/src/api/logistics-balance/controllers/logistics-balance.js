"use strict";

// @ts-ignore
const { createCoreController } = require("@strapi/strapi").factories;
const { requireAdmin, verifyHasRole } = require('../../../utils/auth0-verify');

const LOGISTICS_BALANCE_UID = "api::logistics-balance.logistics-balance";
const LOGISTICS_TRANSACTION_UID = "api::logistics-transaction.logistics-transaction";
const STORE_UID = "api::store.store";


const getUserStore = async (ctx) => {
  const user = ctx.state.strapiUser;
  if (!user)
    return null;

  const stores = await strapi.entityService.findMany(STORE_UID, {
    filters: {
      users_permissions_user: {
        id: user?.id,
      },
    },
    limit: 1,
  });

  return stores?.[0] ?? null;
};


module.exports = createCoreController(LOGISTICS_BALANCE_UID, ({ strapi }) => ({
  async getMyBalance(ctx) {
    try {
      const user = ctx.state?.strapiUser;

      if (!user)
        return ctx.unauthorized("Debes iniciar sesión para consultar tu saldo");

      const store = await getUserStore(ctx);

      if (!store)
        return ctx.notFound("No se encontró una tienda asociada al usuario");

      const balance = await strapi.service(LOGISTICS_BALANCE_UID).getBalanceSummary(store.id);

      ctx.body = {
        success: true,
        store: {
          id: store.id,
          name: store.name,
        },
        balance,
      };
    } catch (error) {
      strapi.log.error("Error consultando balance logístico:", error);

      ctx.status = error.status || 500;

      ctx.body = {
        success: false,
        message: error.message || "No fue posible consultar el balance",
      };
    }
  },

  /**
   * Body:
   * {
   *  amount:0,
   *  paymentId:0,
   * description:'',
   * 
   * }
   */
  async createDeposit(ctx) {
    try {
      const user = ctx.state.strapiUser;

      if (!user) {
        return ctx.unauthorized("Debes iniciar sesión para realizar un depósito");
      }

      const store = await getUserStore(ctx);

      if (!store) {
        return ctx.notFound("No se encontró una tienda asociada al usuario");
      }

      const body = ctx.request.body || {};
      const amount = Number(body.amount);

      if (!Number.isFinite(amount) || amount <= 0) {
        return ctx.badRequest("El monto debe ser mayor a cero");
      }

      const result = await strapi.service(LOGISTICS_BALANCE_UID).createDeposit({
        storeId: store.id,
        amount,
        paymentId: body.paymentId ?? null,
        userId: user.id,
        description: body.description ?? "Solicitud de depósito logístico",
        externalReference: body.externalReference ?? null,
        metadata: {
          source: "logistics-balance.createDeposit",
        },
        idempotencyKey: body.idempotencyKey ?? null,
      });

      ctx.status = 201;

      ctx.body = {
        success: true,
        message: "Solicitud de depósito creada correctamente",
        deposit: result,
      };
    } catch (error) {
      strapi.log.error("Error creando depósito logístico:", error);

      ctx.status = error.status || 500;

      ctx.body = {
        success: false,
        message: error.message || "No fue posible crear el depósito",
        details: error.details || null,
      };
    }
  },

  async getDeposits(ctx) {
    try {
      const user = ctx.state.strapiUser;

      if (!user) {
        return ctx.unauthorized("Debes iniciar sesión");
      }

      const roles = user?.roles?.extra;
      const isAdmin = verifyHasRole(roles, "admin") || verifyHasRole(roles, "Admin") || verifyHasRole(roles, "Administrador");

      const filters = {
        type: "deposit",
      };

      if (!isAdmin) {
        const store = await getUserStore(ctx);

        if (!store) {
          return ctx.notFound("No se encontró una tienda asociada");
        }

        filters.store = {
          id: store.id,
        };
      }

      const transactions = await strapi.entityService.findMany(
        LOGISTICS_TRANSACTION_UID,
        {
          filters,
          sort: {
            createdAt: "desc",
          },
          populate: {
            store: true,
            payment: {
              populate: {
                comprobante: true
              }
            },
            by_user: true,
          },
        }
      );

      ctx.body = {
        success: true,
        deposits: transactions,
      };
    } catch (error) {
      strapi.log.error("Error consultando depósitos:", error);

      ctx.status = error.status || 500;

      ctx.body = {
        success: false,
        message: error.message || "No fue posible consultar los depósitos",
      };
    }
  },

  async getAllBalances(ctx) {
    try {
      const admin = await requireAdmin(ctx, strapi);

      if (!admin.valid) {
        return admin.response;
      }

      const balances = await strapi.entityService.findMany(
        LOGISTICS_BALANCE_UID,
        {
          sort: {
            updatedAt: "desc",
          },
          populate: {
            store: true,
          },
        }
      );

      ctx.body = {
        success: true,
        balances,
      };
    } catch (error) {
      strapi.log.error("Error consultando balances:", error);

      ctx.status = error.status || 500;

      ctx.body = {
        success: false,
        message: error.message || "No fue posible consultar los balances",
      };
    }
  },

  async approveDeposit(ctx) {
    try {
      const admin = await requireAdmin(ctx, strapi);

      if (!admin.valid) {
        return admin.response;
      }

      const transactionId = Number(ctx.params.id);

      if (!Number.isInteger(transactionId) || transactionId <= 0) {
        return ctx.badRequest("El ID del depósito no es válido");
      }

      const body = ctx.request.body || {};

      const result = await strapi
        .service(LOGISTICS_BALANCE_UID)
        .approveDeposit({
          transactionId,
          userId: admin.user.id,
          externalReference: body.externalReference ?? null,
          metadata: {
            ...(body.metadata || {}),
            source: "logistics-balance.approveDeposit",
          },
        });

      ctx.body = {
        success: true,
        message: "Depósito aprobado correctamente",
        deposit: result,
      };

    } catch (error) {
      strapi.log.error("Error aprobando depósito logístico:", error);

      ctx.status = error.status || 500;

      ctx.body = {
        success: false,
        message: error.message || "No fue posible aprobar el depósito",
        details: error.details || null,
      };
    }
  },

  async rejectDeposit(ctx) {
    try {
      const admin = await requireAdmin(ctx, strapi);

      if (!admin.valid) {
        return admin.response;
      }

      const transactionId = Number(ctx.params.id);

      if (!Number.isInteger(transactionId) || transactionId <= 0) {
        return ctx.badRequest("El ID del depósito no es válido");
      }

      const body = ctx.request.body || {};

      const reason = body.reason || "Depósito rechazado por administración";

      const result = await strapi
        .service(LOGISTICS_BALANCE_UID)
        .rejectDeposit({
          transactionId,
          userId: admin.user.id,
          reason,
          metadata: {
            ...(body.metadata || {}),
            source: "logistics-balance.rejectDeposit",
          },
        });

      ctx.body = {
        success: true,
        message: "Depósito rechazado correctamente",
        deposit: result,
      };
    } catch (error) {
      strapi.log.error("Error rechazando depósito logístico:", error);

      ctx.status = error.status || 500;

      ctx.body = {
        success: false,
        message: error.message || "No fue posible rechazar el depósito",
        details: error.details || null,
      };
    }
  }
}));
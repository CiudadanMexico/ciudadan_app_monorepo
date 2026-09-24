"use strict";

// @ts-ignore
const { createCoreController, } = require("@strapi/strapi").factories;
const { requireAdmin } = require('../../../utils/auth0-verify');

const TRANSACTION_UID = "api::logistics-transaction.logistics-transaction";

module.exports = createCoreController(TRANSACTION_UID, ({ strapi }) => ({
  async find(ctx) {
    try {
      const admin = await requireAdmin(ctx, strapi);

      if (!admin.valid) {
        return admin.response;
      }

      const {
        page = 1,
        pageSize = 20,
        status,
        type,
        storeId,
        dateFrom,
        dateTo,
      } = ctx.query;

      const filters = {};

      if (status) {
        filters.status = status;
      }

      if (type) {
        filters.type = type;
      }

      if (storeId) {
        const parsedStoreId = Number(storeId);

        if (!Number.isInteger(parsedStoreId) || parsedStoreId <= 0) {
          return ctx.badRequest("storeId no es válido");
        }

        filters.store = {
          id: parsedStoreId,
        };
      }

      if (dateFrom || dateTo) {
        filters.createdAt = {};

        if (dateFrom) {
          filters.createdAt.$gte = dateFrom;
        }

        if (dateTo) {
          filters.createdAt.$lte = dateTo;
        }
      }

      const currentPage = Math.max(Number(page), 1);
      const currentPageSize = Math.min(Math.max(Number(pageSize), 1), 100);

      const result = await strapi.entityService.findPage(
        TRANSACTION_UID,
        {
          filters,
          sort: {
            createdAt: "desc",
          },
          populate: {
            store: true,
            order: true,
            payment: true,
            by_user: true,
          },
          page: currentPage,
          pageSize: currentPageSize,
        }
      );

      ctx.body = {
        success: true,
        transactions: result.results,
        pagination: result.pagination,
      };
    } catch (error) {
      strapi.log.error("Error consultando transacciones logísticas:", error);

      ctx.status = error.status || 500;

      ctx.body = {
        success: false,
        message: error.message || "No fue posible consultar las transacciones",
      };
    }
  },

  async findOne(ctx) {
    try {
      const admin = await requireAdmin(ctx, strapi);

      if (!admin.valid) {
        return admin.response;
      }

      const transactionId = Number(ctx.params.id);

      if (!Number.isInteger(transactionId) || transactionId <= 0) {
        return ctx.badRequest("El ID de la transacción no es válido");
      }

      const transaction = await strapi.entityService.findOne(
        TRANSACTION_UID,
        transactionId,
        {
          populate: {
            store: true,
            order: true,
            payment: true,
            by_user: true,
          },
        }
      );

      if (!transaction) {
        return ctx.notFound("Transacción no encontrada");
      }

      ctx.body = {
        success: true,
        transaction,
      };
    } catch (error) {
      strapi.log.error("Error consultando transacción logística:", error);

      ctx.status = error.status || 500;

      ctx.body = {
        success: false,
        message: error.message || "No fue posible consultar la transacción",
      };
    }
  }

})
);
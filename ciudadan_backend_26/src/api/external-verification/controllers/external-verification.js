"use strict";

const { createCoreController } = require("@strapi/strapi").factories;
const { registerExternalVerification } = require("../services/register-external-verification");

const getActorId = (ctx) => ctx.state.user?.id || ctx.request.body?.userId || null;

module.exports = createCoreController(
  "api::external-verification.external-verification",
  ({ strapi }) => ({
    async register(ctx) {
      const { id } = ctx.params;
      const {
        entityType,
        entityId,
        sourceName,
        sourceType,
        verificationMethod,
        checkType,
        queryReference,
        result,
        resultData,
        evidenceId,
      } = ctx.request.body || {};

      if (!id) return ctx.badRequest("id es requerido.");

      try {
        const created = await registerExternalVerification(strapi, {
          validationId: Number(id),
          entityType,
          entityId,
          sourceName,
          sourceType,
          verificationMethod,
          checkType,
          queryReference,
          result,
          resultData,
          evidenceId,
          performedById: getActorId(ctx),
        });
        return ctx.send({ data: created });
      } catch (error) {
        const status = error.status || 500;
        if (status === 404) return ctx.notFound(error.message);
        if (status === 400) return ctx.badRequest(error.message);
        strapi.log.error("registerExternalVerification failed", error);
        return ctx.internalServerError(
          error.message || "No se pudo registrar la consulta oficial."
        );
      }
    },
  })
);

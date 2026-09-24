"use strict";

const { createCoreController } = require("@strapi/strapi").factories;
const { createAudit, completeAudit } = require("../services/audit-workflow");
const { detectCollusionSignals } = require("../services/collusion-detection");

const getActorId = (ctx) => ctx.state.user?.id || ctx.request.body?.userId || null;

module.exports = createCoreController(
  "api::verification-audit.verification-audit",
  ({ strapi }) => ({
    async createForValidation(ctx) {
      const { id } = ctx.params;
      const { auditorId, auditorAgencyId, auditType, selectionReason } = ctx.request.body || {};

      if (!id) return ctx.badRequest("id es requerido.");

      try {
        const audit = await createAudit(strapi, {
          validationId: Number(id),
          auditorId,
          auditorAgencyId,
          auditType,
          selectionReason,
        });
        return ctx.send({ data: audit });
      } catch (error) {
        const status = error.status || 500;
        if (status === 404) return ctx.notFound(error.message);
        if (status === 400) return ctx.badRequest(error.message);
        strapi.log.error("createAudit failed", error);
        return ctx.internalServerError(error.message || "No se pudo crear la auditoría.");
      }
    },

    async submitResult(ctx) {
      const { id } = ctx.params;
      const { result, score, notes } = ctx.request.body || {};

      if (!id) return ctx.badRequest("id es requerido.");

      try {
        const outcome = await completeAudit(strapi, {
          auditId: Number(id),
          result,
          score,
          notes,
          actorId: getActorId(ctx),
        });
        return ctx.send({ data: outcome.audit, escalation: outcome.escalation });
      } catch (error) {
        const status = error.status || 500;
        if (status === 404) return ctx.notFound(error.message);
        if (status === 400) return ctx.badRequest(error.message);
        strapi.log.error("completeAudit failed", error);
        return ctx.internalServerError(
          error.message || "No se pudo registrar el resultado de la auditoría."
        );
      }
    },

    async collusionSignals(ctx) {
      const { agencyId } = ctx.query || {};
      if (!agencyId) return ctx.badRequest("agencyId es requerido.");

      try {
        const signals = await detectCollusionSignals(strapi, { agencyId: Number(agencyId) });
        return ctx.send({ data: signals });
      } catch (error) {
        strapi.log.error("detectCollusionSignals failed", error);
        return ctx.internalServerError(
          error.message || "No se pudieron calcular las señales de colusión."
        );
      }
    },
  })
);

"use strict";

const { createCoreController } = require("@strapi/strapi").factories;
const {
  updateEvidenceReview,
} = require("../../cars-validation/services/validation-review");

const getActorId = (ctx) =>
  ctx.state.user?.id || ctx.request.body?.userId || null;

module.exports = createCoreController(
  "api::cars-evidence.cars-evidence",
  ({ strapi }) => ({
    async updateReview(ctx) {
      const { id } = ctx.params;
      const { review_status: reviewStatus, reviewer_note: reviewerNote } =
        ctx.request.body || {};

      if (!id) return ctx.badRequest("id es requerido.");
      if (!reviewStatus) return ctx.badRequest("review_status es requerido.");

      try {
        const updated = await updateEvidenceReview(strapi, {
          evidenceId: Number(id),
          reviewStatus,
          reviewerNote,
          reviewerId: getActorId(ctx),
        });
        return ctx.send({ data: updated });
      } catch (error) {
        const status = error.status || 500;
        if (status === 404) return ctx.notFound(error.message);
        if (status === 400) return ctx.badRequest(error.message);
        strapi.log.error("updateReview failed", error);
        return ctx.internalServerError(
          error.message || "No se pudo actualizar la evidencia."
        );
      }
    },
  })
);

"use strict";

const { createCoreController } = require("@strapi/strapi").factories;
const {
  createFromAgenda,
  resolveByAgenda,
  getReviewBundle,
} = require("../services/validation-from-agenda");
const {
  updateValidationObservations,
  updateValidationChecklist,
  completeValidation,
  syncValidationFromDriver,
} = require("../services/validation-review");
const { getResubmissionContextForDriver } = require("../services/resubmission-workflow");
const {
  issueChallenge,
} = require("../../cars-validation-challenge/services/challenge-workflow");
const { runRiskAssessment } = require("../services/risk-engine");
const { createReverification } = require("../services/reverification-workflow");

const getActorId = (ctx) => ctx.state.user?.id || ctx.request.body?.userId || null;

module.exports = createCoreController(
  "api::cars-validation.cars-validation",
  ({ strapi }) => ({
    async createFromAgenda(ctx) {
      const isAuthenticated = ctx.state.isAuthenticated;
      if (!isAuthenticated) {
        return ctx.unauthorized("Debes iniciar sesión.");
      }

      const { driverId, agendaId, agencyId, userId, appointmentDate } =
        ctx.request.body || {};

      if (!driverId || !agendaId || !appointmentDate) {
        return ctx.badRequest(
          "driverId, agendaId y appointmentDate son requeridos."
        );
      }

      try {
        const result = await createFromAgenda(strapi, {
          userId: Number(userId || getActorId(ctx)),
          driverId: Number(driverId),
          agendaId: Number(agendaId),
          agencyId: agencyId ? Number(agencyId) : null,
          appointmentDate,
        });

        return ctx.send({ data: result.validation, meta: result.meta });
      } catch (error) {
        const status = error.status || 500;
        if (status === 404) return ctx.notFound(error.message);
        if (status === 403) return ctx.forbidden(error.message);
        if (status === 400) return ctx.badRequest(error.message);
        strapi.log.error("createFromAgenda failed", error);
        return ctx.internalServerError(
          error.message || "No se pudo crear la validación."
        );
      }
    },

    async getResubmissionContext(ctx) {
      const { driverId } = ctx.query;
      if (!driverId) {
        return ctx.badRequest("driverId es requerido.");
      }

      try {
        const context = await getResubmissionContextForDriver(
          strapi,
          Number(driverId)
        );
        if (!context) {
          return ctx.send({ data: null });
        }
        return ctx.send({ data: context });
      } catch (error) {
        strapi.log.error("getResubmissionContext failed", error);
        return ctx.internalServerError(
          error.message || "No se pudo cargar el contexto de reenvío."
        );
      }
    },

    async resolveByAgenda(ctx) {
      const { agendaId } = ctx.query;
      if (!agendaId) {
        return ctx.badRequest("agendaId es requerido.");
      }

      const validation = await resolveByAgenda(strapi, Number(agendaId));
      if (!validation) {
        return ctx.notFound("No existe validación para esta agenda.");
      }

      return ctx.send({ data: { id: validation.id, validation } });
    },

    async getReviewBundle(ctx) {
      const { id } = ctx.params;
      if (!id) {
        return ctx.badRequest("id es requerido.");
      }

      try {
        const validation = await getReviewBundle(strapi, Number(id));
        return ctx.send({ data: validation });
      } catch (error) {
        if (error.status === 404) return ctx.notFound(error.message);
        strapi.log.error("getReviewBundle failed", error);
        return ctx.internalServerError(
          error.message || "No se pudo cargar la validación."
        );
      }
    },

    async runRiskAssessment(ctx) {
      const { id } = ctx.params;
      if (!id) return ctx.badRequest("id es requerido.");

      try {
        const assessment = await runRiskAssessment(strapi, { validationId: Number(id) });
        return ctx.send({ data: assessment });
      } catch (error) {
        const status = error.status || 500;
        if (status === 404) return ctx.notFound(error.message);
        if (status === 400) return ctx.badRequest(error.message);
        strapi.log.error("runRiskAssessment failed", error);
        return ctx.internalServerError(
          error.message || "No se pudo calcular el riesgo de la validación."
        );
      }
    },

    async createReverification(ctx) {
      const { id } = ctx.params;
      const { reason, preferredAgencyId, preferredVerifierId } = ctx.request.body || {};

      if (!id) return ctx.badRequest("id es requerido.");

      try {
        const outcome = await createReverification(strapi, {
          originalValidationId: Number(id),
          reason,
          preferredAgencyId,
          preferredVerifierId,
          actorId: getActorId(ctx),
        });
        return ctx.send({
          data: outcome.reverification,
          warnings: {
            sameAgency: outcome.sameAgencyWarning,
            sameVerifier: outcome.sameVerifierWarning,
          },
        });
      } catch (error) {
        const status = error.status || 500;
        if (status === 404) return ctx.notFound(error.message);
        if (status === 400) return ctx.badRequest(error.message);
        strapi.log.error("createReverification failed", error);
        return ctx.internalServerError(
          error.message || "No se pudo crear la re-verificación."
        );
      }
    },

    async updateObservations(ctx) {
      const { id } = ctx.params;
      const { observations } = ctx.request.body || {};

      if (!id) return ctx.badRequest("id es requerido.");

      try {
        const updated = await updateValidationObservations(strapi, {
          validationId: Number(id),
          observations,
          actorId: getActorId(ctx),
        });
        return ctx.send({ data: updated });
      } catch (error) {
        if (error.status === 404) return ctx.notFound(error.message);
        strapi.log.error("updateObservations failed", error);
        return ctx.internalServerError(error.message || "No se pudieron guardar las observaciones.");
      }
    },

    async updateChecklist(ctx) {
      const { id } = ctx.params;
      const { checklist } = ctx.request.body || {};

      if (!id) return ctx.badRequest("id es requerido.");

      try {
        const updated = await updateValidationChecklist(strapi, {
          validationId: Number(id),
          checklist,
          actorId: getActorId(ctx),
        });
        return ctx.send({ data: updated });
      } catch (error) {
        if (error.status === 404) return ctx.notFound(error.message);
        if (error.status === 400) return ctx.badRequest(error.message);
        strapi.log.error("updateChecklist failed", error);
        return ctx.internalServerError(error.message || "No se pudo actualizar el checklist.");
      }
    },

    async complete(ctx) {
      const { id } = ctx.params;
      const { action, observations } = ctx.request.body || {};

      if (!id) return ctx.badRequest("id es requerido.");
      if (!action) return ctx.badRequest("action es requerido.");

      try {
        const result = await completeValidation(strapi, {
          validationId: Number(id),
          action,
          observations,
          reviewerId: getActorId(ctx),
        });
        return ctx.send({
          data: result.validation,
          meta: { agendaSync: result.agendaSync },
        });
      } catch (error) {
        const status = error.status || 500;
        if (status === 404) return ctx.notFound(error.message);
        if (status === 400) return ctx.badRequest(error.message);
        strapi.log.error("complete validation failed", error);
        return ctx.internalServerError(error.message || "No se pudo completar la validación.");
      }
    },

    // docs/TAXIS-VERIFICACION-CONDUCTORES-FASES.md, Fase 1: challenge/nonce
    // de un solo uso por paso, no reutilizable durante toda la sesión.
    async issueChallenge(ctx) {
      const { id } = ctx.params;
      const { step, sessionId } = ctx.request.body || {};

      if (!id) return ctx.badRequest("id es requerido.");
      if (!step) return ctx.badRequest("step es requerido.");

      try {
        const challenge = await issueChallenge(strapi, {
          validationId: Number(id),
          step,
          sessionId,
        });
        return ctx.send({ data: challenge });
      } catch (error) {
        const status = error.status || 500;
        if (status === 404) return ctx.notFound(error.message);
        if (status === 400) return ctx.badRequest(error.message);
        strapi.log.error("issueChallenge failed", error);
        return ctx.internalServerError(
          error.message || "No se pudo emitir el challenge."
        );
      }
    },

    async syncFromDriver(ctx) {
      const { driverId, userId, origin } = ctx.request.body || {};

      if (!driverId) return ctx.badRequest("driverId es requerido.");

      try {
        const result = await syncValidationFromDriver(strapi, {
          driverId: Number(driverId),
          actorId: Number(userId || getActorId(ctx)),
          origin: origin || "reupload",
        });
        return ctx.send({ data: result });
      } catch (error) {
        const status = error.status || 500;
        if (status === 404) return ctx.notFound(error.message);
        strapi.log.error("syncFromDriver failed", error);
        return ctx.internalServerError(error.message || "No se pudo sincronizar evidencias.");
      }
    },
  })
);

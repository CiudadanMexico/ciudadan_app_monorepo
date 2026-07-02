"use strict";

const { logValidationEvent } = require("./validation-audit");
const {
  buildEvidenceEventPayload,
  buildValidationStatusPayload,
  buildObservationsPayload,
} = require("./validation-event-helpers");
const { syncEvidencesFromDriver } = require("./evidence-sync");
const {
  syncAgendaFromValidationClose,
  syncAgendaInReview,
} = require("./agenda-sync");
const { enterResubmissionMode } = require("./resubmission-workflow");
const { getRelationId, DRIVER_MEDIA_POPULATE } = require("./helpers");
const {
  ACTIVE_VALIDATION_STATUSES,
  UI_TO_REVIEW_STATUS,
  REVIEW_ACTION_TO_EVENT,
  mapCompleteAction,
} = require("./validation-state");

const findActiveValidationByDriver = async (strapi, driverId) => {
  const rows = await strapi.entityService.findMany(
    "api::cars-validation.cars-validation",
    {
      filters: {
        driver: { id: driverId },
        status: { $in: ACTIVE_VALIDATION_STATUSES },
      },
      sort: { createdAt: "desc" },
      limit: 1,
    }
  );
  return rows[0] || null;
};

const updateEvidenceReview = async (
  strapi,
  { evidenceId, reviewStatus, reviewerNote, reviewerId }
) => {
  const evidence = await strapi.entityService.findOne(
    "api::cars-evidence.cars-evidence",
    evidenceId,
    { populate: { validation: true } }
  );

  if (!evidence) {
    const error = new Error("Evidencia no encontrada.");
    error.status = 404;
    throw error;
  }

  const normalizedStatus = UI_TO_REVIEW_STATUS[reviewStatus] || reviewStatus;
  const allowed = [
    "pending",
    "needs_review",
    "approved",
    "rejected",
    "resub_requested",
  ];
  if (!allowed.includes(normalizedStatus)) {
    const error = new Error("Estado de revisión inválido.");
    error.status = 400;
    throw error;
  }

  const previousStatus = evidence.review_status || "pending";

  const updated = await strapi.entityService.update(
    "api::cars-evidence.cars-evidence",
    evidenceId,
    {
      data: {
        review_status: normalizedStatus,
        reviewer_note: reviewerNote || null,
        reviewed_at: new Date(),
        reviewer: reviewerId || null,
        is_valid: normalizedStatus === "approved",
      },
    }
  );

  const validationId = getRelationId(evidence.validation);
  if (validationId) {
    const validation = await strapi.entityService.findOne(
      "api::cars-validation.cars-validation",
      validationId
    );

    if (validation && ["pending", "active"].includes(validation.status)) {
      const previousValidationStatus = validation.status;
      await strapi.entityService.update(
        "api::cars-validation.cars-validation",
        validationId,
        {
          data: { status: "under_review" },
        }
      );
      await syncAgendaInReview(strapi, { validationId, reviewerId });

      await logValidationEvent(strapi, {
        validationId,
        evidenceId: null,
        actorId: reviewerId,
        action: "validation_status_changed",
        payload: buildValidationStatusPayload({
          previousStatus: previousValidationStatus,
          newStatus: "under_review",
          result: validation.result,
        }),
      });
    }

    if (previousStatus !== normalizedStatus) {
      await logValidationEvent(strapi, {
        validationId,
        evidenceId,
        actorId: reviewerId,
        action:
          REVIEW_ACTION_TO_EVENT[normalizedStatus] ||
          "evidence_resub_requested",
        payload: buildEvidenceEventPayload(evidence, {
          previousStatus,
          newStatus: normalizedStatus,
          reviewerNote,
        }),
      });
    }
  }

  return updated;
};

const updateValidationObservations = async (
  strapi,
  { validationId, observations, actorId }
) => {
  const validation = await strapi.entityService.findOne(
    "api::cars-validation.cars-validation",
    validationId
  );
  if (!validation) {
    const error = new Error("Validación no encontrada.");
    error.status = 404;
    throw error;
  }

  const previousObservations = validation.observations || "";
  const newObservations = typeof observations === "string" ? observations : "";

  const updated = await strapi.entityService.update(
    "api::cars-validation.cars-validation",
    validationId,
    {
      data: { observations: newObservations },
    }
  );

  await logValidationEvent(strapi, {
    validationId,
    actorId,
    action: "observations_updated",
    payload: buildObservationsPayload({
      previousObservations,
      newObservations,
    }),
  });

  return updated;
};

const updateValidationChecklist = async (
  strapi,
  { validationId, checklist, actorId }
) => {
  const validation = await strapi.entityService.findOne(
    "api::cars-validation.cars-validation",
    validationId
  );
  if (!validation) {
    const error = new Error("Validación no encontrada.");
    error.status = 404;
    throw error;
  }

  const updated = await strapi.entityService.update(
    "api::cars-validation.cars-validation",
    validationId,
    {
      data: { checklist: checklist || {} },
    }
  );

  await logValidationEvent(strapi, {
    validationId,
    actorId,
    action: "checklist_updated",
    payload: { checklist: checklist || {} },
  });

  return updated;
};

const completeValidation = async (
  strapi,
  { validationId, action, observations, reviewerId }
) => {
  const validation = await strapi.entityService.findOne(
    "api::cars-validation.cars-validation",
    validationId,
    {
      populate: {
        driver: true,
        evidences: true,
        agenda: true,
      },
    }
  );

  if (!validation) {
    const error = new Error("Validación no encontrada.");
    error.status = 404;
    throw error;
  }

  if (["completed", "cancelled", "expired"].includes(validation.status)) {
    const error = new Error("La validación ya está cerrada.");
    error.status = 400;
    throw error;
  }

  const mapped = mapCompleteAction(action, validation.evidences || []);

  if (mapped.markResubEvidenceIds?.length) {
    for (const evidenceId of mapped.markResubEvidenceIds) {
      const evidenceRow = await strapi.entityService.findOne(
        "api::cars-evidence.cars-evidence",
        evidenceId
      );
      const previousEvidenceStatus = evidenceRow?.review_status || "pending";

      await strapi.entityService.update(
        "api::cars-evidence.cars-evidence",
        evidenceId,
        {
          data: {
            review_status: "resub_requested",
            reviewed_at: new Date(),
            reviewer: reviewerId || null,
          },
        }
      );

      if (evidenceRow) {
        await logValidationEvent(strapi, {
          validationId,
          evidenceId,
          actorId: reviewerId,
          action: "evidence_resub_requested",
          payload: buildEvidenceEventPayload(evidenceRow, {
            previousStatus: previousEvidenceStatus,
            newStatus: "resub_requested",
            extra: { source: "complete_validation", action: "request_resub" },
          }),
        });
      }
    }
  }

  if (mapped.enterResubmissionMode) {
    return enterResubmissionMode(strapi, {
      validation,
      validationId,
      reviewerId,
      observations,
      action,
    });
  }

  const validationUpdate = {
    status: mapped.validationStatus,
    result: mapped.validationResult,
    validation_finished_at:
      mapped.validationStatus === "completed" ? new Date() : null,
    closed_at: mapped.validationStatus === "completed" ? new Date() : null,
    reviewer: reviewerId || getRelationId(validation.reviewer) || null,
  };

  if (typeof observations === "string") {
    validationUpdate.observations = observations;
  }

  if (
    action === "approve" &&
    typeof observations === "string" &&
    observations.trim() &&
    mapped.validationResult === "approved"
  ) {
    validationUpdate.result = "approved_with_observations";
    mapped.validationResult = "approved_with_observations";
  }

  const previousValidationStatus = validation.status;

  const updatedValidation = await strapi.entityService.update(
    "api::cars-validation.cars-validation",
    validationId,
    { data: validationUpdate }
  );

  if (previousValidationStatus !== mapped.validationStatus) {
    await logValidationEvent(strapi, {
      validationId,
      actorId: reviewerId,
      action: "validation_status_changed",
      payload: buildValidationStatusPayload({
        previousStatus: previousValidationStatus,
        newStatus: mapped.validationStatus,
        result: mapped.validationResult,
        action,
      }),
    });
  }

  const driverId = getRelationId(validation.driver);
  if (driverId) {
    await strapi.entityService.update("api::driver.driver", driverId, {
      data: {
        status: mapped.driverStatus,
        in_person_verification_completed: mapped.inPersonVerificationCompleted,
        final_approval: mapped.finalApproval,
        reviewer: reviewerId || null,
      },
    });

    await logValidationEvent(strapi, {
      validationId,
      actorId: reviewerId,
      action: "driver_status_synced",
      payload: {
        driverId,
        status: mapped.driverStatus,
        final_approval: mapped.finalApproval,
      },
    });
  }

  await logValidationEvent(strapi, {
    validationId,
    actorId: reviewerId,
    action: "validation_completed",
    payload: {
      action,
      result: mapped.validationResult,
      status: mapped.validationStatus,
    },
  });

  const agendaSync = await syncAgendaFromValidationClose(strapi, {
    validation,
    validationStatus: mapped.validationStatus,
    validationResult: mapped.validationResult,
    action,
    reviewerId,
  });

  const fullValidation = await strapi.entityService.findOne(
    "api::cars-validation.cars-validation",
    validationId,
    {
      populate: {
        driver: true,
        agency: true,
        agenda: true,
        reviewer: true,
        evidences: { populate: { file: true } },
        events: {
          populate: { actor: true, evidence: true },
          sort: { createdAt: "desc" },
        },
      },
    }
  );

  return { validation: fullValidation, agendaSync };
};

const syncValidationFromDriver = async (
  strapi,
  { driverId, actorId, origin = "reupload" }
) => {
  console.log("syncValidationFromDriver", driverId, actorId, origin);
  const validation = await findActiveValidationByDriver(strapi, driverId);
  if (!validation) {
    const error = new Error(
      "No hay una validación activa para este conductor."
    );
    error.status = 404;
    throw error;
  }

  const driver = await strapi.entityService.findOne(
    "api::driver.driver",
    driverId,
    {
      populate: DRIVER_MEDIA_POPULATE,
    }
  );

  if (!driver) {
    const error = new Error("Conductor no encontrado.");
    error.status = 404;
    throw error;
  }

  const syncResult = await syncEvidencesFromDriver(strapi, {
    validationId: validation.id,
    driver,
    actorId,
    origin,
  });

  const previousValidationStatus = validation.status;

  if (syncResult.created.length || syncResult.superseded.length) {
    await strapi.entityService.update(
      "api::cars-validation.cars-validation",
      validation.id,
      {
        data: { status: "under_review", result: "manual_review" },
      }
    );

    await strapi.entityService.update("api::driver.driver", driverId, {
      data: { status: "pending_review" },
    });
  }

  if (syncResult.created.length || syncResult.superseded.length) {
    await logValidationEvent(strapi, {
      validationId: validation.id,
      actorId,
      action: "evidence_synced",
      payload: {
        origin,
        createdEvidenceIds: syncResult.created,
        supersededEvidenceIds: syncResult.superseded,
        createdEvidenceCount: syncResult.created.length,
        supersededEvidenceCount: syncResult.superseded.length,
      },
    });

    if (previousValidationStatus !== "under_review") {
      await logValidationEvent(strapi, {
        validationId: validation.id,
        evidenceId: null,
        actorId,
        action: "validation_status_changed",
        payload: buildValidationStatusPayload({
          previousStatus: previousValidationStatus,
          newStatus: "under_review",
          result: "manual_review",
          action: "evidence_reupload",
        }),
      });
    }

    await syncAgendaInReview(strapi, {
      validationId: validation.id,
      reviewerId: actorId,
    });

    for (const supersededId of syncResult.superseded) {
      const supersededEvidence = await strapi.entityService.findOne(
        "api::cars-evidence.cars-evidence",
        supersededId
      );
      await logValidationEvent(strapi, {
        validationId: validation.id,
        evidenceId: supersededId,
        actorId,
        action: "evidence_superseded",
        payload: buildEvidenceEventPayload(supersededEvidence, {
          previousStatus: supersededEvidence?.review_status || "pending",
          newStatus: "superseded",
          extra: { origin },
        }),
      });
    }
  }

  return {
    validationId: validation.id,
    ...syncResult,
  };
};

module.exports = {
  findActiveValidationByDriver,
  updateEvidenceReview,
  updateValidationObservations,
  updateValidationChecklist,
  completeValidation,
  syncValidationFromDriver,
};

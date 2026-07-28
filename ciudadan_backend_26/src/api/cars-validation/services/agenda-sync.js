"use strict";

const { logValidationEvent } = require("./validation-audit");
const { getRelationId, mergeAgendaMetadata } = require("./helpers");
const {
  AGENDA_ESTADO,
  normalizeAgendaEstado,
} = require("../../agenda/constants/agenda-estado");

/** Estados de validación que cierran la cita en agenda. */
const VALIDATION_STATUSES_THAT_CLOSE_AGENDA = ["completed", "cancelled", "expired"];

const mapValidationStatusToAgendaEstado = (validationStatus) => {
  switch (validationStatus) {
    case "completed":
      return AGENDA_ESTADO.COMPLETED;
    case "cancelled":
      return AGENDA_ESTADO.CANCELLED;
    case "expired":
      return AGENDA_ESTADO.EXPIRED;
    case "under_review":
      return AGENDA_ESTADO.IN_REVIEW;
    case "awaiting_resubmission":
      return AGENDA_ESTADO.RESUBMIT_FILES;
    default:
      return null;
  }
};

const mergeAgendaClosureMetadata = (agenda, validation, syncContext) => {
  const base = mergeAgendaMetadata(
    agenda,
    validation.id,
    getRelationId(validation.driver)
  );

  return {
    ...base,
    validation_status: syncContext.validationStatus,
    validation_result: syncContext.validationResult || null,
    validation_action: syncContext.action || null,
    validation_closed_at: syncContext.closedAt || new Date().toISOString(),
    agenda_synced_at: new Date().toISOString(),
    appointment_attended: syncContext.validationStatus === "completed",
  };
};

/**
 * Sincroniza agenda.estado a partir del cierre de una validación.
 */
const syncAgendaFromValidationClose = async (
  strapi,
  {
    validation,
    validationStatus,
    validationResult,
    action,
    reviewerId,
  }
) => {
  const agendaId = getRelationId(validation.agenda);
  if (!agendaId) {
    return { synced: false, skipped: true, reason: "no_linked_agenda" };
  }

  if (!VALIDATION_STATUSES_THAT_CLOSE_AGENDA.includes(validationStatus)) {
    return { synced: false, skipped: true, reason: "validation_not_closed" };
  }

  const agendaEstado = mapValidationStatusToAgendaEstado(validationStatus);
  if (!agendaEstado) {
    return { synced: false, skipped: true, reason: "unmapped_validation_status" };
  }

  const agenda = await strapi.entityService.findOne("api::agenda.agenda", agendaId);
  if (!agenda) {
    return { synced: false, skipped: true, reason: "agenda_not_found", agendaId };
  }

  const closedAt = new Date().toISOString();
  const metadata = mergeAgendaClosureMetadata(agenda, validation, {
    validationStatus,
    validationResult,
    action,
    closedAt,
  });

  const currentEstado = normalizeAgendaEstado(agenda.estado || agenda.status);
  const alreadySynced =
    currentEstado === agendaEstado &&
    agenda.metadata?.validation_status === validationStatus &&
    agenda.metadata?.validation_id === validation.id;

  if (!alreadySynced) {
    await strapi.entityService.update("api::agenda.agenda", agendaId, {
      data: {
        estado: agendaEstado,
        checked: validationStatus === "completed",
        metadata,
      },
    });
  }

  await logValidationEvent(strapi, {
    validationId: validation.id,
    evidenceId: null,
    actorId: reviewerId,
    action: "agenda_synced",
    payload: {
      agendaId,
      agendaEstado,
      validationStatus,
      validationResult,
      action,
      alreadySynced,
    },
  });

  return {
    synced: true,
    skipped: alreadySynced,
    agendaId,
    agendaEstado,
    validationStatus,
  };
};

/**
 * Marca agenda como en revisión cuando la validación entra en under_review.
 */
const syncAgendaInReview = async (strapi, { validationId, reviewerId }) => {
  const validation = await strapi.entityService.findOne(
    "api::cars-validation.cars-validation",
    validationId,
    { populate: { agenda: true, driver: true } }
  );

  if (!validation || validation.status !== "under_review") {
    return { synced: false, skipped: true };
  }

  const agendaId = getRelationId(validation.agenda);
  if (!agendaId) return { synced: false, skipped: true, reason: "no_linked_agenda" };

  const agenda = await strapi.entityService.findOne("api::agenda.agenda", agendaId);
  const currentEstado = normalizeAgendaEstado(agenda?.estado || agenda?.status);

  if (!agenda || currentEstado === AGENDA_ESTADO.COMPLETED) {
    return { synced: false, skipped: true };
  }

  if (currentEstado === AGENDA_ESTADO.IN_REVIEW) {
    return { synced: false, skipped: true, reason: "already_in_review" };
  }

  await strapi.entityService.update("api::agenda.agenda", agendaId, {
    data: {
      estado: AGENDA_ESTADO.IN_REVIEW,
      metadata: mergeAgendaMetadata(agenda, validation.id, getRelationId(validation.driver)),
    },
  });

  return { synced: true, agendaId, agendaEstado: AGENDA_ESTADO.IN_REVIEW };
};

/**
 * Marca agenda como resubir_archivos cuando la validación espera corrección del conductor.
 */
const syncAgendaAwaitingResubmission = async (strapi, { validationId, reviewerId }) => {
  const validation = await strapi.entityService.findOne(
    "api::cars-validation.cars-validation",
    validationId,
    { populate: { agenda: true, driver: true } }
  );

  if (!validation || validation.status !== "awaiting_resubmission") {
    return { synced: false, skipped: true };
  }

  const agendaId = getRelationId(validation.agenda);
  if (!agendaId) return { synced: false, skipped: true, reason: "no_linked_agenda" };

  const agenda = await strapi.entityService.findOne("api::agenda.agenda", agendaId);
  const currentEstado = normalizeAgendaEstado(agenda?.estado || agenda?.status);

  if (!agenda || currentEstado === AGENDA_ESTADO.COMPLETED) {
    return { synced: false, skipped: true };
  }

  if (currentEstado === AGENDA_ESTADO.RESUBMIT_FILES) {
    return { synced: false, skipped: true, reason: "already_awaiting_resubmission" };
  }

  await strapi.entityService.update("api::agenda.agenda", agendaId, {
    data: {
      estado: AGENDA_ESTADO.RESUBMIT_FILES,
      metadata: mergeAgendaMetadata(agenda, validation.id, getRelationId(validation.driver)),
    },
  });

  await logValidationEvent(strapi, {
    validationId,
    evidenceId: null,
    actorId: reviewerId,
    action: "agenda_synced",
    payload: {
      agendaId,
      agendaEstado: AGENDA_ESTADO.RESUBMIT_FILES,
      validationStatus: validation.status,
      validationResult: validation.result,
      action: "request_resub",
    },
  });

  return { synced: true, agendaId, agendaEstado: AGENDA_ESTADO.RESUBMIT_FILES };
};

module.exports = {
  AGENDA_ESTADO,
  VALIDATION_STATUSES_THAT_CLOSE_AGENDA,
  mapValidationStatusToAgendaEstado,
  syncAgendaFromValidationClose,
  syncAgendaInReview,
  syncAgendaAwaitingResubmission,
};

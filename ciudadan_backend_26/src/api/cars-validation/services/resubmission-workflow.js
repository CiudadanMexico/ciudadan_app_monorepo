"use strict";

const { logValidationEvent } = require("./validation-audit");
const {
  buildValidationStatusPayload,
} = require("./validation-event-helpers");
const { getRelationId, mergeAgendaMetadata } = require("./helpers");
const { AGENDA_ESTADO, normalizeAgendaEstado } = require("../../agenda/constants/agenda-estado");
const { syncAgendaAwaitingResubmission } = require("./agenda-sync");

const RESUBMISSION_ACTIVE_STATUSES = [
  "pending",
  "active",
  "under_review",
  "awaiting_resubmission",
];

const EVIDENCE_TYPE_LABELS = {
  profile_photo: "Foto de perfil",
  selfie_live: "Selfie verificación",
  id_front: "INE — frente",
  id_back: "INE — reverso",
  license_front: "Licencia — frente",
  license_back: "Licencia — reverso",
  proof_of_address: "Comprobante domicilio",
  vehicle_front: "Foto vehículo — frente",
  vehicle_back: "Foto vehículo — trasera",
  vehicle_left: "Foto vehículo — lateral",
  vehicle_right: "Foto vehículo — lateral derecha",
  registration_card: "Tarjeta de circulación",
  insurance_document: "Seguro del vehículo",
  interior: "Foto vehículo — interior",
};

const EVIDENCE_TYPE_TO_WIZARD_STEP = {
  profile_photo: "documentos",
  selfie_live: "documentos",
  id_front: "documentos",
  id_back: "documentos",
  proof_of_address: "documentos",
  license_front: "documentos",
  license_back: "documentos",
  vehicle_front: "fotos",
  vehicle_back: "fotos",
  vehicle_left: "fotos",
  vehicle_right: "fotos",
  interior: "fotos",
  registration_card: "fotos",
  insurance_document: "fotos",
};

const WIZARD_STEP_ORDER = ["documentos", "licencia", "vehiculo", "fotos"];

const RESUBMISSION_REVIEW_STATUSES = ["resub_requested", "rejected"];

const getCurrentEvidences = (evidences = []) =>
  evidences.filter((evidence) => evidence.is_current !== false);

const computeRequiredSteps = (evidences = []) => {
  const steps = new Set();
  for (const evidence of getCurrentEvidences(evidences)) {
    if (!RESUBMISSION_REVIEW_STATUSES.includes(evidence.review_status)) continue;
    const step = EVIDENCE_TYPE_TO_WIZARD_STEP[evidence.type];
    if (step) steps.add(step);
  }
  return WIZARD_STEP_ORDER.filter((step) => steps.has(step));
};

const computeResumeStep = (requiredSteps = []) => {
  for (const step of WIZARD_STEP_ORDER) {
    if (requiredSteps.includes(step)) return step;
  }
  return "documentos";
};

const buildRequiredDocuments = (evidences = []) =>
  getCurrentEvidences(evidences)
    .filter((evidence) => RESUBMISSION_REVIEW_STATUSES.includes(evidence.review_status))
    .map((evidence) => ({
      evidenceId: evidence.id,
      evidenceType: evidence.type,
      label: EVIDENCE_TYPE_LABELS[evidence.type] || evidence.type,
      status: evidence.review_status,
      reviewerNote: evidence.reviewer_note || null,
      wizardStep: EVIDENCE_TYPE_TO_WIZARD_STEP[evidence.type] || "documentos",
    }));

const buildResubmissionMetadata = (validation, { requiredSteps, requiredDocuments }) => {
  const current =
    validation.metadata && typeof validation.metadata === "object"
      ? validation.metadata
      : {};
  const previousCycle = Number(current.resubmission?.cycle || 0);

  return {
    ...current,
    resubmission: {
      cycle: previousCycle + 1,
      requested_at: new Date().toISOString(),
      required_steps: requiredSteps,
      required_document_types: requiredDocuments.map((doc) => doc.evidenceType),
      resume_step: computeResumeStep(requiredSteps),
    },
  };
};

const buildResubmissionContext = (validation, agenda = null) => {
  const evidences = validation.evidences || [];
  const requiredDocuments = buildRequiredDocuments(evidences);
  const requiredSteps = computeRequiredSteps(evidences);
  const resumeStep =
    validation.metadata?.resubmission?.resume_step || computeResumeStep(requiredSteps);
  const agendaEstado = agenda
    ? normalizeAgendaEstado(agenda.estado || agenda.status)
    : null;

  const canEditPreregister =
    validation.status === "awaiting_resubmission" ||
    agendaEstado === AGENDA_ESTADO.RESUBMIT_FILES;

  return {
    validation: {
      id: validation.id,
      status: validation.status,
      result: validation.result,
      observations: validation.observations || null,
    },
    agenda: agenda
      ? {
          id: agenda.id,
          fecha_inicio: agenda.fecha_inicio,
          ciudad: agenda.ciudad,
          estado: agendaEstado,
        }
      : null,
    requiredDocuments,
    requiredSteps,
    resumeStep,
    canEditPreregister: Boolean(canEditPreregister && requiredDocuments.length),
  };
};

const findResubmissionValidationByDriver = async (strapi, driverId) => {
  const rows = await strapi.entityService.findMany(
    "api::cars-validation.cars-validation",
    {
      filters: {
        driver: { id: driverId },
        status: { $in: RESUBMISSION_ACTIVE_STATUSES },
      },
      sort: { createdAt: "desc" },
      limit: 1,
      populate: {
        agenda: true,
        evidences: { populate: { file: true } },
      },
    }
  );
  return rows[0] || null;
};

const getResubmissionContextForDriver = async (strapi, driverId) => {
  const validation = await findResubmissionValidationByDriver(strapi, driverId);
  if (!validation) {
    return null;
  }

  if (validation.status !== "awaiting_resubmission") {
    const requiredDocuments = buildRequiredDocuments(validation.evidences || []);
    if (!requiredDocuments.length) {
      return null;
    }
  }

  const agenda = validation.agenda
    ? typeof validation.agenda === "object"
      ? validation.agenda
      : await strapi.entityService.findOne("api::agenda.agenda", getRelationId(validation.agenda))
    : null;

  return buildResubmissionContext(validation, agenda);
};

const enterResubmissionMode = async (
  strapi,
  { validation, validationId, reviewerId, observations, action = "request_resub" }
) => {
  const evidences = validation.evidences || [];
  const requiredDocuments = buildRequiredDocuments(evidences);
  const requiredSteps = computeRequiredSteps(evidences);
  const resumeStep = computeResumeStep(requiredSteps);
  const previousValidationStatus = validation.status;

  const metadata = buildResubmissionMetadata(validation, {
    requiredSteps,
    requiredDocuments,
  });

  const validationUpdate = {
    status: "awaiting_resubmission",
    result: "resubmission_required",
    validation_finished_at: null,
    closed_at: null,
    metadata,
    reviewer: reviewerId || getRelationId(validation.reviewer) || null,
  };

  if (typeof observations === "string") {
    validationUpdate.observations = observations;
  }

  const updatedValidation = await strapi.entityService.update(
    "api::cars-validation.cars-validation",
    validationId,
    { data: validationUpdate }
  );

  if (previousValidationStatus !== "awaiting_resubmission") {
    await logValidationEvent(strapi, {
      validationId,
      evidenceId: null,
      actorId: reviewerId,
      action: "validation_status_changed",
      payload: buildValidationStatusPayload({
        previousStatus: previousValidationStatus,
        newStatus: "awaiting_resubmission",
        result: "resubmission_required",
        action,
      }),
    });
  }

  await logValidationEvent(strapi, {
    validationId,
    evidenceId: null,
    actorId: reviewerId,
    action: "resubmission_requested",
    payload: {
      action,
      required_steps: requiredSteps,
      required_document_types: requiredDocuments.map((doc) => doc.evidenceType),
      resume_step: resumeStep,
      cycle: metadata.resubmission?.cycle || 1,
    },
  });

  const driverId = getRelationId(validation.driver);
  if (driverId) {
    await strapi.entityService.update("api::driver.driver", driverId, {
      data: {
        status: "documents_rejected",
        current_step: resumeStep,
        in_person_verification_completed: false,
        final_approval: false,
        reviewer: reviewerId || null,
      },
    });

    await logValidationEvent(strapi, {
      validationId,
      evidenceId: null,
      actorId: reviewerId,
      action: "driver_status_synced",
      payload: {
        driverId,
        status: "documents_rejected",
        current_step: resumeStep,
      },
    });
  }

  await logValidationEvent(strapi, {
    validationId,
    evidenceId: null,
    actorId: reviewerId,
    action: "validation_completed",
    payload: {
      action,
      result: "resubmission_required",
      status: "awaiting_resubmission",
    },
  });

  const agendaSync = await syncAgendaAwaitingResubmission(strapi, {
    validationId,
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

  return { validation: fullValidation || updatedValidation, agendaSync };
};

module.exports = {
  RESUBMISSION_ACTIVE_STATUSES,
  EVIDENCE_TYPE_TO_WIZARD_STEP,
  computeRequiredSteps,
  computeResumeStep,
  buildRequiredDocuments,
  buildResubmissionContext,
  findResubmissionValidationByDriver,
  getResubmissionContextForDriver,
  enterResubmissionMode,
};

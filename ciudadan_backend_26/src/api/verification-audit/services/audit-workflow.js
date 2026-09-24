"use strict";

const { logValidationEvent } = require("../../cars-validation/services/validation-audit");
const { computeRiskAssessment } = require("../../cars-validation/services/risk-engine");
const { AUDIT_CHECK_KEYS } = require("./audit-check-keys");
const { decideSamplingProfile, rollForAudit } = require("./sampling");
const { recomputeAgencyReputation } = require("./reputation-engine");

const VALIDATION_UID = "api::cars-validation.cars-validation";
const AUDIT_UID = "api::verification-audit.verification-audit";
const AUDIT_ITEM_UID = "api::verification-audit-item.verification-audit-item";
const USER_UID = "plugin::users-permissions.user";

// docs/TAXIS-VERIFICACION-CONDUCTORES-FASES.md, Fase 6: mismos roles que
// permite la policy is-auditor.js de CoWork — no se reinventa el control de
// acceso, solo se reusa el mismo criterio (roles.extra o role.name/type).
const AUDIT_ROLES = ["admin", "auditor"];

const AUDIT_RESULTS = ["conformity", "inconsistency", "insufficient", "evidence_fraud"];
const ITEM_RESULTS = ["pass", "fail", "uncertain", "not_applicable"];

const badRequest = (message) => {
  const error = new Error(message);
  error.status = 400;
  return error;
};

const notFound = (message) => {
  const error = new Error(message);
  error.status = 404;
  return error;
};

const assertHasAuditorRole = (user) => {
  const extra = Array.isArray(user?.roles?.extra) ? user.roles.extra : [];
  const roleName = user?.role?.name || user?.role?.type || null;
  const tienePermiso = extra.some((rol) => AUDIT_ROLES.includes(rol)) || AUDIT_ROLES.includes(roleName);
  if (!tienePermiso) {
    throw badRequest(
      "El usuario asignado como auditor no tiene el rol 'auditor' (o 'admin') de CoWork."
    );
  }
};

/**
 * Crea una auditoría. Regla dura (Fase 6): el auditor nunca puede ser la
 * misma persona que el verificador de ese expediente — se valida aquí,
 * en backend, no solo en la UI.
 */
const createAudit = async (
  strapi,
  { validationId, auditorId, auditorAgencyId, auditType, selectionReason }
) => {
  if (!validationId) throw badRequest("validationId es requerido.");
  if (!auditorId) throw badRequest("auditorId es requerido.");
  if (!["sample", "deep", "reverification_trigger"].includes(auditType)) {
    throw badRequest("audit_type inválido.");
  }
  if (
    !["random", "risk", "complaint", "new_verifier", "anomaly", "critical_case", "escalation"].includes(
      selectionReason
    )
  ) {
    throw badRequest("selection_reason inválido.");
  }

  const validation = await strapi.entityService.findOne(VALIDATION_UID, validationId, {
    populate: { reviewer: true },
  });
  if (!validation) throw notFound("Validación no encontrada.");

  const reviewerId = validation.reviewer?.id || validation.reviewer || null;
  if (reviewerId && Number(reviewerId) === Number(auditorId)) {
    throw badRequest(
      "El auditor no puede ser la misma persona que el verificador de este expediente."
    );
  }

  const auditor = await strapi.entityService.findOne(USER_UID, auditorId, {
    populate: { role: true },
  });
  if (!auditor) throw badRequest("El auditor (auditorId) no existe.");
  assertHasAuditorRole(auditor);

  const audit = await strapi.entityService.create(AUDIT_UID, {
    data: {
      validation: validationId,
      auditor: auditorId,
      auditor_agency: auditorAgencyId || null,
      audit_type: auditType,
      selection_reason: selectionReason,
      status: "pending",
      started_at: new Date(),
    },
  });

  await logValidationEvent(strapi, {
    validationId,
    actorId: auditorId,
    action: "audit_created",
    payload: { auditId: audit.id, auditType, selectionReason },
  });

  return audit;
};

const submitAuditItem = async (
  strapi,
  { auditId, checkKey, result, evidenceIds, externalVerificationIds, note }
) => {
  if (!auditId) throw badRequest("auditId es requerido.");
  if (!AUDIT_CHECK_KEYS.includes(checkKey)) throw badRequest(`check_key inválido: ${checkKey}`);
  if (!ITEM_RESULTS.includes(result)) throw badRequest("result inválido.");

  const audit = await strapi.entityService.findOne(AUDIT_UID, auditId);
  if (!audit) throw notFound("Auditoría no encontrada.");
  if (audit.status === "completed" || audit.status === "escalated") {
    throw badRequest("Esta auditoría ya está cerrada — no se pueden agregar más items.");
  }

  if (audit.status === "pending") {
    await strapi.entityService.update(AUDIT_UID, auditId, { data: { status: "in_progress" } });
  }

  const item = await strapi.entityService.create(AUDIT_ITEM_UID, {
    data: {
      audit: auditId,
      check_key: checkKey,
      result,
      evidence_reviewed: evidenceIds || [],
      external_verifications_reviewed: externalVerificationIds || [],
      note: note || null,
    },
  });

  return item;
};

/**
 * Doble auditoría (Fase 6, sección 28): si dos auditorías "primarias"
 * (no de escalamiento) de la misma validación ya están completadas y su
 * `result` no coincide, ambas se marcan `escalated` — un humano debe crear
 * una tercera auditoría (`selection_reason=escalation`) para Auditor C.
 */
const resolveDoubleAudit = async (strapi, { validationId }) => {
  const audits = await strapi.entityService.findMany(AUDIT_UID, {
    filters: { validation: validationId, selection_reason: { $ne: "escalation" } },
  });

  const completed = audits.filter((a) => a.status === "completed");
  if (completed.length < 2) return { needsEscalation: false };

  const [first, second] = completed.sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
  if (first.result === second.result) return { needsEscalation: false };

  await Promise.all(
    [first, second].map((a) =>
      strapi.entityService.update(AUDIT_UID, a.id, { data: { status: "escalated" } })
    )
  );

  await logValidationEvent(strapi, {
    validationId,
    action: "audit_escalated",
    payload: { auditIds: [first.id, second.id], results: [first.result, second.result] },
  });

  return { needsEscalation: true, auditIds: [first.id, second.id] };
};

const completeAudit = async (strapi, { auditId, result, score, notes, actorId }) => {
  if (!auditId) throw badRequest("auditId es requerido.");
  if (!AUDIT_RESULTS.includes(result)) throw badRequest("result inválido.");

  const audit = await strapi.entityService.findOne(AUDIT_UID, auditId, {
    populate: { validation: { populate: { agency: true } } },
  });
  if (!audit) throw notFound("Auditoría no encontrada.");
  if (audit.status === "completed") throw badRequest("Esta auditoría ya está completada.");
  if (audit.status === "escalated") throw badRequest("Esta auditoría ya fue escalada.");

  const updated = await strapi.entityService.update(AUDIT_UID, auditId, {
    data: {
      status: "completed",
      result,
      score: Number.isFinite(score) ? score : null,
      notes: notes || null,
      completed_at: new Date(),
    },
  });

  const validationId = audit.validation?.id || audit.validation;

  await logValidationEvent(strapi, {
    validationId,
    actorId,
    action: "audit_completed",
    payload: { auditId, result, score: Number.isFinite(score) ? score : null },
  });

  const escalation = await resolveDoubleAudit(strapi, { validationId });

  const agencyId = audit.validation?.agency?.id || audit.validation?.agency || null;
  const reputationUpdate = agencyId
    ? await recomputeAgencyReputation(strapi, { agencyId })
    : null;

  return { audit: updated, escalation, reputationUpdate };
};

/**
 * Decide si una validación debe entrar a muestreo de auditoría (Fase 6,
 * sección 27), combinando el perfil del verificador con el risk_score de la
 * Fase 5. No crea la auditoría — solo informa la decisión, para que quien
 * llame decida qué auditor asignar.
 */
const evaluateSamplingForValidation = async (strapi, { validationId, randomFn }) => {
  if (!validationId) throw badRequest("validationId es requerido.");

  const validation = await strapi.entityService.findOne(VALIDATION_UID, validationId, {
    populate: { reviewer: true },
  });
  if (!validation) throw notFound("Validación no encontrada.");

  const reviewerId = validation.reviewer?.id || validation.reviewer || null;
  const completedValidationsByVerifier = reviewerId
    ? await strapi.entityService.count(VALIDATION_UID, {
        filters: { reviewer: reviewerId, status: "completed" },
      })
    : 0;

  const riskAssessment = await computeRiskAssessment(strapi, { validationId });
  const profile = decideSamplingProfile({ completedValidationsByVerifier, riskAssessment });
  const shouldAudit = rollForAudit(profile.rate, randomFn);

  return { ...profile, shouldAudit, completedValidationsByVerifier, riskAssessment };
};

module.exports = {
  createAudit,
  submitAuditItem,
  completeAudit,
  resolveDoubleAudit,
  evaluateSamplingForValidation,
  assertHasAuditorRole,
};

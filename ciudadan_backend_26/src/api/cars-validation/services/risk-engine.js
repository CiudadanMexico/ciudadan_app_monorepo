"use strict";

const { STEP_SEQUENCE } = require("../../cars-validation-challenge/services/step-sequence");
const { BOOLEAN_FIELDS } = require("./checklist-schema");
const { computeComparisons } = require("./comparisons");
const { logValidationEvent } = require("./validation-audit");

const VALIDATION_UID = "api::cars-validation.cars-validation";
const EVIDENCE_UID = "api::cars-evidence.cars-evidence";
const EXTERNAL_VERIFICATION_UID = "api::external-verification.external-verification";

// docs/TAXIS-VERIFICACION-CONDUCTORES-FASES.md, Fase 5 (sección 22) — pesos
// ilustrativos del documento fuente. "Deben ser configuración, no código
// fijo, y calibrarse/versionarse con datos reales" — de momento viven aquí
// como una constante versionada (RISK_WEIGHTS_VERSION); promoverlos a una
// fila de configuración en BD es el siguiente paso natural si hace falta
// ajustarlos sin desplegar código, sin romper este contrato.
//
// `nonce_invalid` se documenta pero nunca se evalúa aquí: un nonce inválido
// ya bloquea la creación de la evidencia en `validateAndConsumeChallenge`
// (Fase 1) — nunca llega a existir un cars-evidence con esa condición, así
// que la señal es estructural, no calculada.
const RISK_WEIGHTS_VERSION = 1;
const RISK_WEIGHTS = {
  nonce_invalid: 50,
  hash_mismatch: 40,
  duplicate_evidence: 40,
  repuve_reported: 60,
  vin_mismatch: 50,
  gps_distant: 20,
  checklist_incomplete: 15,
  external_source_unavailable: 5,
  sequence_anomaly: 10,
};

// Señales que la sección 22 marca como "revisión crítica" — nunca se puede
// cerrar aprobado mientras alguna esté presente (ver validation-review.js).
const CRITICAL_SIGNALS = ["repuve_reported", "vin_mismatch"];

const notFound = (message) => {
  const error = new Error(message);
  error.status = 404;
  return error;
};

/**
 * Red de seguridad, no la vía principal de bloqueo: el orden ya lo impone
 * `assertStepUnlocked` (Fase 3) al emitir cada challenge. Esto solo detecta
 * inconsistencias de timestamps que pudieran colarse por datos migrados o
 * corregidos manualmente.
 */
const detectSequenceAnomaly = (evidences) => {
  const byStep = new Map();
  for (const evidence of evidences) {
    if (!byStep.has(evidence.type)) byStep.set(evidence.type, evidence.createdAt);
  }

  let lastTimestamp = null;
  let lastStep = null;
  for (const step of STEP_SEQUENCE) {
    const timestamp = byStep.get(step);
    if (!timestamp) continue;
    if (lastTimestamp && new Date(timestamp) < new Date(lastTimestamp)) {
      return {
        step,
        after: lastStep,
        message: `El paso "${step}" se registró antes que "${lastStep}".`,
      };
    }
    lastTimestamp = timestamp;
    lastStep = step;
  }
  return null;
};

/**
 * Calcula el risk_score y las comparaciones estructuradas de una validación
 * a partir de su estado actual (evidencia, checklist, consultas oficiales).
 * No persiste nada — quien llama decide qué hacer con el resultado
 * (`runRiskAssessment` sí persiste `risk_score`; `completeValidation` solo
 * lo usa para decidir si puede cerrar como aprobado).
 */
const computeRiskAssessment = async (strapi, { validationId }) => {
  const validation = await strapi.entityService.findOne(VALIDATION_UID, validationId, {
    populate: { driver: true },
  });
  if (!validation) throw notFound("Validación no encontrada.");

  const [evidences, externalVerifications] = await Promise.all([
    strapi.entityService.findMany(EVIDENCE_UID, {
      filters: { validation: validationId, is_current: true },
    }),
    strapi.entityService.findMany(EXTERNAL_VERIFICATION_UID, {
      filters: { validation: validationId },
    }),
  ]);

  const driver =
    validation.driver && typeof validation.driver === "object" ? validation.driver : null;
  const checklist = validation.checklist || {};
  const comparisons = computeComparisons(driver, checklist, externalVerifications);

  const signals = [];
  const addSignal = (key, detail) => signals.push({ key, weight: RISK_WEIGHTS[key], detail: detail || {} });

  const hashMismatchEvidence = evidences.filter((e) =>
    e.validation_flags?.flags?.includes("hash_mismatch_client_server")
  );
  if (hashMismatchEvidence.length) {
    addSignal("hash_mismatch", { evidenceIds: hashMismatchEvidence.map((e) => e.id) });
  }

  const duplicateEvidence = evidences.filter((e) =>
    e.validation_flags?.flags?.includes("duplicate_hash")
  );
  if (duplicateEvidence.length) {
    addSignal("duplicate_evidence", { evidenceIds: duplicateEvidence.map((e) => e.id) });
  }

  const repuveReported = externalVerifications.find(
    (v) => v.source_name?.trim().toUpperCase() === "REPUVE" && v.result === "reported"
  );
  if (repuveReported) addSignal("repuve_reported", { externalVerificationId: repuveReported.id });

  if (comparisons.vin === "mismatch") addSignal("vin_mismatch", {});

  const unavailableSources = externalVerifications.filter((v) => v.result === "unavailable");
  if (unavailableSources.length) {
    addSignal("external_source_unavailable", { count: unavailableSources.length });
  }

  const missingChecklistFields = BOOLEAN_FIELDS.filter((field) => checklist[field] !== true);
  if (missingChecklistFields.length) {
    addSignal("checklist_incomplete", { missing: missingChecklistFields });
  }

  const sequenceAnomaly = detectSequenceAnomaly(evidences);
  if (sequenceAnomaly) addSignal("sequence_anomaly", sequenceAnomaly);

  const score = signals.reduce((sum, s) => sum + s.weight, 0);
  const criticalSignals = signals.filter((s) => CRITICAL_SIGNALS.includes(s.key)).map((s) => s.key);

  return {
    score,
    weightsVersion: RISK_WEIGHTS_VERSION,
    signals,
    comparisons,
    checklistComplete: missingChecklistFields.length === 0,
    hasCriticalSignals: criticalSignals.length > 0,
    criticalSignals,
  };
};

/** Calcula y persiste el risk_score; mueve la validación a `automatic_review`
 * si todavía no está cerrada (ver Fase 5, máquina de estados). */
const runRiskAssessment = async (strapi, { validationId }) => {
  const assessment = await computeRiskAssessment(strapi, { validationId });

  const validation = await strapi.entityService.findOne(VALIDATION_UID, validationId);
  const data = { risk_score: assessment.score };
  if (["pending", "active", "under_review"].includes(validation.status)) {
    data.status = "automatic_review";
  }

  const updated = await strapi.entityService.update(VALIDATION_UID, validationId, { data });

  // docs/Verificacion_Conductores_v2.docx, sección 8: "risk_calculated —
  // Cálculo de riesgo" — evento explícito del documento fuente que faltaba.
  await logValidationEvent(strapi, {
    validationId,
    action: "risk_calculated",
    payload: { score: assessment.score, signals: assessment.signals.map((s) => s.key) },
  });

  return { ...assessment, validation: updated };
};

module.exports = {
  computeRiskAssessment,
  runRiskAssessment,
  RISK_WEIGHTS,
  RISK_WEIGHTS_VERSION,
  CRITICAL_SIGNALS,
};

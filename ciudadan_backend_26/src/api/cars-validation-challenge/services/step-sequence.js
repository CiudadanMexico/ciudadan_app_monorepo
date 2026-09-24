"use strict";

/**
 * docs/TAXIS-VERIFICACION-CONDUCTORES-FASES.md, Fase 3: "definir la
 * secuencia obligatoria de pasos del protocolo presencial — no permitir
 * saltarse pasos." Mismo orden que `LIVE_CAPTURE_STEPS` en el frontend
 * (ciudadan_frontend/src/components/Taxis/driver-verification/LiveCaptureWizard.jsx).
 *
 * `official_query_capture` (Fase 4) e `incident` (evento, no paso) son
 * condicionales — no forman parte de la secuencia obligatoria.
 */
const STEP_SEQUENCE = [
  "selfie_live",
  "id_front",
  "id_back",
  "license_front",
  "license_back",
  "registration_card",
  "insurance_document",
  "plates",
  "vin",
  "vehicle_front",
  "vehicle_back",
  "vehicle_left",
  "vehicle_right",
  "interior",
  "trunk",
  "video_360",
];

const EVIDENCE_UID = "api::cars-evidence.cars-evidence";

/**
 * Lanza un error 400 si `step` no es el siguiente paso pendiente de la
 * secuencia obligatoria para esta validación (evalúa contra la evidencia ya
 * registrada, no contra los challenges emitidos, para que un challenge
 * emitido pero nunca consumido no bloquee un reintento del mismo paso).
 */
const assertStepUnlocked = async (strapi, { validationId, step }) => {
  const stepIndex = STEP_SEQUENCE.indexOf(step);
  if (stepIndex <= 0) return; // no secuenciado, o es el primer paso

  const requiredPriorSteps = STEP_SEQUENCE.slice(0, stepIndex);

  const existingEvidences = await strapi.entityService.findMany(EVIDENCE_UID, {
    filters: {
      validation: validationId,
      type: { $in: requiredPriorSteps },
    },
  });
  const completedSteps = new Set(existingEvidences.map((e) => e.type));

  const missingStep = requiredPriorSteps.find((s) => !completedSteps.has(s));
  if (missingStep) {
    const error = new Error(
      `No puedes capturar "${step}" todavía — falta completar el paso "${missingStep}" primero.`
    );
    error.status = 400;
    throw error;
  }
};

module.exports = { STEP_SEQUENCE, assertStepUnlocked };

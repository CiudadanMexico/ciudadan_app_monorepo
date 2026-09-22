"use strict";

const crypto = require("crypto");
const { assertStepUnlocked } = require("./step-sequence");
const { logValidationEvent } = require("../../cars-validation/services/validation-audit");

const CHALLENGE_UID = "api::cars-validation-challenge.cars-validation-challenge";
const VALIDATION_UID = "api::cars-validation.cars-validation";

// docs/TAXIS-VERIFICACION-CONDUCTORES-FASES.md, Fase 1: "es preferible un
// challenge por operacion/evidence_type que uno reutilizable durante toda
// la sesion" — ventana corta porque cada paso pide uno nuevo.
const DEFAULT_TTL_MINUTES = 10;

const issueChallenge = async (
  strapi,
  { validationId, step, sessionId, ttlMinutes = DEFAULT_TTL_MINUTES }
) => {
  if (!validationId) {
    const error = new Error("validationId es requerido.");
    error.status = 400;
    throw error;
  }
  if (!step) {
    const error = new Error("step es requerido.");
    error.status = 400;
    throw error;
  }

  const validation = await strapi.entityService.findOne(
    VALIDATION_UID,
    validationId
  );
  if (!validation) {
    const error = new Error("Validación no encontrada.");
    error.status = 404;
    throw error;
  }

  await assertStepUnlocked(strapi, { validationId, step });

  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

  const challenge = await strapi.entityService.create(CHALLENGE_UID, {
    data: {
      validation: validationId,
      nonce_id: crypto.randomUUID(),
      session_id: sessionId || crypto.randomUUID(),
      step,
      issued_at: now,
      expires_at: expiresAt,
      status: "issued",
    },
  });

  // docs/Verificacion_Conductores_v2.docx, sección 8: "challenge_issued —
  // Emisión de nonce/challenge" — evento explícito del documento fuente que
  // faltaba en la bitácora.
  await logValidationEvent(strapi, {
    validationId,
    action: "challenge_issued",
    payload: { step, nonceId: challenge.nonce_id },
  });

  return challenge;
};

// Backend debe validar session_id, vigencia y que el nonce no se reutilice
// (Fase 1). Marca el challenge como usado atomicamente respecto a su propio
// estado: si ya no esta en "issued", rechaza — eso es lo que impide el reuso.
const validateAndConsumeChallenge = async (
  strapi,
  { nonceId, sessionId, step }
) => {
  if (!nonceId) {
    const error = new Error("nonceId es requerido.");
    error.status = 400;
    throw error;
  }

  const [challenge] = await strapi.entityService.findMany(CHALLENGE_UID, {
    filters: { nonce_id: nonceId },
    limit: 1,
  });

  if (!challenge) {
    const error = new Error("Nonce inválido.");
    error.status = 400;
    throw error;
  }

  if (challenge.status !== "issued") {
    const error = new Error(`Nonce ya ${challenge.status} — no se puede reutilizar.`);
    error.status = 400;
    throw error;
  }

  const now = new Date();
  if (new Date(challenge.expires_at) < now) {
    await strapi.entityService.update(CHALLENGE_UID, challenge.id, {
      data: { status: "expired" },
    });
    const error = new Error("Nonce expirado.");
    error.status = 400;
    throw error;
  }

  if (sessionId && challenge.session_id !== sessionId) {
    const error = new Error("El nonce no corresponde a esta sesión.");
    error.status = 400;
    throw error;
  }

  if (step && challenge.step !== step) {
    const error = new Error("El nonce no corresponde a este paso.");
    error.status = 400;
    throw error;
  }

  const updated = await strapi.entityService.update(
    CHALLENGE_UID,
    challenge.id,
    {
      data: { status: "used", used_at: now },
    }
  );

  return updated;
};

module.exports = { issueChallenge, validateAndConsumeChallenge };

"use strict";

/**
 * docs/TAXIS-VERIFICACION-CONDUCTORES-FASES.md, Fase 6 (sección 27):
 * muestreo configurable por perfil — "los porcentajes deben ser
 * configuración, no código fijo". De momento viven aquí como una constante
 * versionada (SAMPLING_VERSION), igual que RISK_WEIGHTS en la Fase 5;
 * promoverlos a una fila de configuración en BD es el siguiente paso si hace
 * falta ajustarlos sin desplegar código.
 */
const SAMPLING_VERSION = 1;

const SAMPLING_RATES = {
  new_verifier: 0.2,
  stable_verifier: 0.05,
  anomaly: 0.3,
  investigation: 1,
  critical_case: 1,
};

// Menos de este número de validaciones completadas por el verificador
// cuenta como "verificador nuevo" para efectos de muestreo.
const NEW_VERIFIER_THRESHOLD = 10;

// Umbral de risk_score (Fase 5) para tratar el caso como "con anomalías"
// cuando no hay ya una señal crítica explícita.
const ANOMALY_RISK_SCORE_THRESHOLD = 30;

/**
 * Decide el perfil de muestreo de una validación — no decide todavía si se
 * audita (eso es `rollForAudit`, separado para poder probar la selección de
 * perfil de forma determinista sin aleatoriedad).
 */
const decideSamplingProfile = ({ completedValidationsByVerifier = 0, riskAssessment }) => {
  if (riskAssessment?.hasCriticalSignals) {
    return {
      profile: "critical_case",
      rate: SAMPLING_RATES.critical_case,
      requiresDoubleAudit: true,
      selectionReason: "critical_case",
    };
  }

  if ((riskAssessment?.score || 0) >= ANOMALY_RISK_SCORE_THRESHOLD) {
    return {
      profile: "anomaly",
      rate: SAMPLING_RATES.anomaly,
      requiresDoubleAudit: false,
      selectionReason: "anomaly",
    };
  }

  if (completedValidationsByVerifier < NEW_VERIFIER_THRESHOLD) {
    return {
      profile: "new_verifier",
      rate: SAMPLING_RATES.new_verifier,
      requiresDoubleAudit: false,
      selectionReason: "new_verifier",
    };
  }

  return {
    profile: "stable_verifier",
    rate: SAMPLING_RATES.stable_verifier,
    requiresDoubleAudit: false,
    selectionReason: "random",
  };
};

/** Inyectable para pruebas deterministas — en producción usa Math.random. */
const rollForAudit = (rate, randomFn = Math.random) => randomFn() < rate;

module.exports = {
  SAMPLING_VERSION,
  SAMPLING_RATES,
  NEW_VERIFIER_THRESHOLD,
  ANOMALY_RISK_SCORE_THRESHOLD,
  decideSamplingProfile,
  rollForAudit,
};

"use strict";

const VALIDATION_UID = "api::cars-validation.cars-validation";
const AUDIT_UID = "api::verification-audit.verification-audit";
const EVIDENCE_UID = "api::cars-evidence.cars-evidence";

// docs/TAXIS-VERIFICACION-CONDUCTORES-FASES.md, Fase 7: "genera alerta/
// riesgo, nunca una acusación automática por sí sola". Cada detector
// devuelve señales con evidencia de por qué se activó — ninguna bloquea
// nada ni marca a nadie como culpable, son insumos para que un humano
// investigue. Umbrales explícitos y ajustables, no mágicos.
const THRESHOLDS = {
  concentratedAuditorShare: 0.5,
  concentratedAuditorMinAudits: 3,
  abnormalApprovalRate: 0.98,
  abnormalApprovalMinSample: 10,
  mechanicalIntervalToleranceMs: 1000,
  mechanicalMinEvidences: 4,
  mutualAuditingMinCount: 3,
};

/** Auditorías muy concentradas entre las mismas personas (mismo auditor
 * revisando siempre al mismo verificador). */
const detectConcentratedAuditorPairs = (audits) => {
  const byVerifier = new Map();
  for (const a of audits) {
    if (!a.verifierId || !a.auditorId) continue;
    if (!byVerifier.has(a.verifierId)) byVerifier.set(a.verifierId, new Map());
    const byAuditor = byVerifier.get(a.verifierId);
    byAuditor.set(a.auditorId, (byAuditor.get(a.auditorId) || 0) + 1);
  }

  const signals = [];
  for (const [verifierId, byAuditor] of byVerifier.entries()) {
    const total = [...byAuditor.values()].reduce((sum, n) => sum + n, 0);
    if (total < THRESHOLDS.concentratedAuditorMinAudits) continue;
    for (const [auditorId, count] of byAuditor.entries()) {
      const share = count / total;
      if (share >= THRESHOLDS.concentratedAuditorShare) {
        signals.push({
          key: "concentrated_auditor_pair",
          verifierId,
          auditorId,
          share,
          count,
          total,
        });
      }
    }
  }
  return signals;
};

/** Tasa de aprobación anormalmente alta para un verificador. */
const detectAbnormalApprovalRate = (validationsByVerifier) => {
  const signals = [];
  for (const [verifierId, validations] of validationsByVerifier.entries()) {
    if (validations.length < THRESHOLDS.abnormalApprovalMinSample) continue;
    const approved = validations.filter((v) => v.result === "approved" || v.result === "approved_with_observations").length;
    const rate = approved / validations.length;
    if (rate >= THRESHOLDS.abnormalApprovalRate) {
      signals.push({ key: "abnormal_approval_rate", verifierId, rate, sample: validations.length });
    }
  }
  return signals;
};

/** Mismo device_id usado en evidencia de conductores distintos. */
const detectDeviceOverlap = (evidences) => {
  const byDevice = new Map();
  for (const e of evidences) {
    if (!e.deviceId || !e.driverId) continue;
    if (!byDevice.has(e.deviceId)) byDevice.set(e.deviceId, new Set());
    byDevice.get(e.deviceId).add(e.driverId);
  }

  const signals = [];
  for (const [deviceId, driverIds] of byDevice.entries()) {
    if (driverIds.size > 1) {
      signals.push({ key: "device_overlap", deviceId, driverIds: [...driverIds] });
    }
  }
  return signals;
};

/** El mismo server_sha256 reutilizado entre validaciones distintas (más allá
 * del duplicado dentro de una sola validación, ya cubierto por la Fase 2). */
const detectEvidenceReuseAcrossValidations = (evidences) => {
  const byHash = new Map();
  for (const e of evidences) {
    if (!e.serverSha256 || !e.validationId) continue;
    if (!byHash.has(e.serverSha256)) byHash.set(e.serverSha256, new Set());
    byHash.get(e.serverSha256).add(e.validationId);
  }

  const signals = [];
  for (const [hash, validationIds] of byHash.entries()) {
    if (validationIds.size > 1) {
      signals.push({ key: "evidence_reuse_across_validations", hash, validationIds: [...validationIds] });
    }
  }
  return signals;
};

/** Intervalos de captura sospechosamente uniformes ("mecánicos") dentro de
 * una misma validación — posible automatización o evidencia fabricada. */
const detectMechanicalCapturePattern = (evidencesByValidation) => {
  const signals = [];
  for (const [validationId, evidences] of evidencesByValidation.entries()) {
    if (evidences.length < THRESHOLDS.mechanicalMinEvidences) continue;
    const sorted = [...evidences].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const deltas = [];
    for (let i = 1; i < sorted.length; i += 1) {
      deltas.push(new Date(sorted[i].timestamp) - new Date(sorted[i - 1].timestamp));
    }
    const uniform = deltas.every(
      (d) => Math.abs(d - deltas[0]) <= THRESHOLDS.mechanicalIntervalToleranceMs
    );
    if (uniform && deltas[0] > 0) {
      signals.push({ key: "mechanical_capture_pattern", validationId, intervalMs: deltas[0] });
    }
  }
  return signals;
};

/** Dos agencias que se auditan mutuamente por encima de lo esperable. */
const detectMutualAuditing = (auditsWithAgencies) => {
  const pairCounts = new Map();
  for (const a of auditsWithAgencies) {
    if (!a.auditorAgencyId || !a.verifierAgencyId || a.auditorAgencyId === a.verifierAgencyId) continue;
    const key = [a.auditorAgencyId, a.verifierAgencyId].sort().join(":");
    if (!pairCounts.has(key)) {
      pairCounts.set(key, { aToB: 0, bToA: 0, agencyA: a.auditorAgencyId, agencyB: a.verifierAgencyId });
    }
    const entry = pairCounts.get(key);
    if (a.auditorAgencyId === entry.agencyA) entry.aToB += 1;
    else entry.bToA += 1;
  }

  const signals = [];
  for (const entry of pairCounts.values()) {
    if (entry.aToB >= THRESHOLDS.mutualAuditingMinCount && entry.bToA >= THRESHOLDS.mutualAuditingMinCount) {
      signals.push({
        key: "mutual_auditing",
        agencyA: entry.agencyA,
        agencyB: entry.agencyB,
        aToB: entry.aToB,
        bToA: entry.bToA,
      });
    }
  }
  return signals;
};

/**
 * Orquesta todos los detectores contra datos reales de una agencia. Cada
 * detector recibe datos ya normalizados (no objetos crudos de Strapi) para
 * poder probarse por separado sin necesitar una base de datos.
 */
const detectCollusionSignals = async (strapi, { agencyId }) => {
  const audits = await strapi.entityService.findMany(AUDIT_UID, {
    filters: { validation: { agency: agencyId } },
    populate: { auditor: true, validation: { populate: { reviewer: true, agency: true } } },
  });

  const normalizedAudits = audits.map((a) => ({
    auditorId: a.auditor?.id || a.auditor || null,
    verifierId: a.validation?.reviewer?.id || a.validation?.reviewer || null,
    auditorAgencyId: a.auditor_agency || null,
    verifierAgencyId: a.validation?.agency?.id || a.validation?.agency || null,
  }));

  const validations = await strapi.entityService.findMany(VALIDATION_UID, {
    filters: { agency: agencyId, status: "completed" },
    populate: { reviewer: true },
  });

  const validationsByVerifier = new Map();
  for (const v of validations) {
    const verifierId = v.reviewer?.id || v.reviewer;
    if (!verifierId) continue;
    if (!validationsByVerifier.has(verifierId)) validationsByVerifier.set(verifierId, []);
    validationsByVerifier.get(verifierId).push({ result: v.result });
  }

  const evidences = await strapi.entityService.findMany(EVIDENCE_UID, {
    filters: { validation: { agency: agencyId } },
    populate: { validation: { populate: { driver: true } } },
  });

  const normalizedEvidences = evidences.map((e) => ({
    deviceId: e.device_id || null,
    driverId: e.validation?.driver?.id || e.validation?.driver || null,
    serverSha256: e.server_sha256 || null,
    validationId: e.validation?.id || e.validation || null,
    timestamp: e.timestamp_server || e.createdAt,
  }));

  const evidencesByValidation = new Map();
  for (const e of normalizedEvidences) {
    if (!e.validationId) continue;
    if (!evidencesByValidation.has(e.validationId)) evidencesByValidation.set(e.validationId, []);
    evidencesByValidation.get(e.validationId).push(e);
  }

  return {
    concentratedAuditorPairs: detectConcentratedAuditorPairs(normalizedAudits),
    abnormalApprovalRates: detectAbnormalApprovalRate(validationsByVerifier),
    deviceOverlaps: detectDeviceOverlap(normalizedEvidences),
    evidenceReuse: detectEvidenceReuseAcrossValidations(normalizedEvidences),
    mechanicalCapturePatterns: detectMechanicalCapturePattern(evidencesByValidation),
    mutualAuditing: detectMutualAuditing(normalizedAudits),
  };
};

module.exports = {
  THRESHOLDS,
  detectConcentratedAuditorPairs,
  detectAbnormalApprovalRate,
  detectDeviceOverlap,
  detectEvidenceReuseAcrossValidations,
  detectMechanicalCapturePattern,
  detectMutualAuditing,
  detectCollusionSignals,
};

"use strict";

const VALIDATION_UID = "api::cars-validation.cars-validation";
const AUDIT_UID = "api::verification-audit.verification-audit";
const AGENCIA_UID = "api::agencia.agencia";

// docs/TAXIS-VERIFICACION-CONDUCTORES-FASES.md, Fase 7 (sección 30): "Taxis
// calcula el score y escribe el resultado; no lo calcula CoWork. El
// verificador/agencia nunca edita su propio score." No existe ningún
// endpoint que reciba un trust_score como input — siempre se recalcula
// desde el histórico real de validaciones/auditorías, nunca se setea a
// mano, así que la regla "nadie edita su propio score" queda garantizada
// por diseño (no hay a qué input malicioso apuntarle).
//
// La fórmula es una versión MVP explícita (ver `TRUST_ALGORITHM_VERSION`) —
// igual que los pesos de riesgo de la Fase 5, es ilustrativa y debe
// calibrarse con datos reales; versionarla es lo que permite cambiarla sin
// romper la comparabilidad histórica.
const TRUST_ALGORITHM_VERSION = "1.0";

const computeTrustScore = ({ totalAudited, conforming, inconsistencies, criticalFindings }) => {
  if (!totalAudited) return 100; // sin historial auditado -> score neutral por defecto
  const conformingRate = conforming / totalAudited;
  const penalty = (inconsistencies / totalAudited) * 30 + (criticalFindings / totalAudited) * 60;
  const score = conformingRate * 100 - penalty;
  return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
};

/**
 * Calcula las 8 métricas de reputación de una agencia a partir del
 * histórico real (nunca de un contador incremental que se pueda desincronizar).
 */
const computeAgencyReputation = async (strapi, agencyId) => {
  const totalVerifications = await strapi.entityService.count(VALIDATION_UID, {
    filters: { agency: agencyId, status: "completed" },
  });

  const audits = await strapi.entityService.findMany(AUDIT_UID, {
    filters: { validation: { agency: agencyId } },
    populate: { validation: true },
  });

  const auditedValidationIds = new Set(
    audits.map((a) => a.validation?.id || a.validation).filter(Boolean)
  );
  const totalAudited = auditedValidationIds.size;

  const closedAudits = audits.filter((a) => a.status === "completed" || a.status === "escalated");
  const conforming = closedAudits.filter((a) => a.result === "conformity").length;
  const inconsistencies = closedAudits.filter((a) => a.result === "inconsistency").length;
  const criticalFindings = closedAudits.filter(
    (a) => a.result === "evidence_fraud" || a.status === "escalated"
  ).length;

  const reverifications = await strapi.entityService.count(VALIDATION_UID, {
    filters: { reverification_of: { agency: agencyId } },
  });

  const trustScore = computeTrustScore({ totalAudited, conforming, inconsistencies, criticalFindings });

  return {
    total_verifications: totalVerifications,
    total_audited: totalAudited,
    conforming,
    inconsistencies,
    critical_findings: criticalFindings,
    reverifications,
    trust_score: trustScore,
    trust_algorithm_version: TRUST_ALGORITHM_VERSION,
  };
};

/** Recalcula y persiste la reputación de una agencia (api::agencia.agencia, de CoWork). */
const recomputeAgencyReputation = async (strapi, { agencyId }) => {
  if (!agencyId) return null;
  const metrics = await computeAgencyReputation(strapi, agencyId);
  return strapi.entityService.update(AGENCIA_UID, agencyId, { data: metrics });
};

module.exports = { computeAgencyReputation, recomputeAgencyReputation, computeTrustScore, TRUST_ALGORITHM_VERSION };

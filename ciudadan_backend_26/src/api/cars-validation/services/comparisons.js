"use strict";

const crypto = require("crypto");

const REPUVE = "REPUVE";
const INE = "INE";

const hashValue = (value) =>
  crypto.createHash("sha256").update(String(value).trim().toUpperCase()).digest("hex");

/**
 * docs/TAXIS-VERIFICACION-CONDUCTORES-FASES.md, Fase 5 (sección 21):
 * comparaciones estructuradas VIN/placas/marca/modelo/año/color/situación
 * legal/identidad/licencia. El documento fuente exige el RESULTADO de cada
 * comparación pero no dice cómo derivarla — decisiones de diseño tomadas
 * aquí, porque no hay una fuente gubernamental pública que regrese
 * marca/modelo/año/color para contrastar automáticamente:
 *
 *  - VIN/placas: se cruzan contra el hash de lo que el verificador
 *    efectivamente consultó en REPUVE (`query_reference_hash`, Fase 4) —
 *    nunca se compara en claro. Si ninguna consulta REPUVE de esta
 *    validación corresponde a ese valor, es "mismatch" (dato distinto al
 *    consultado); si no hubo ninguna consulta REPUVE, "unavailable".
 *  - marca/modelo/año/color: se derivan del checklist físico (Fase 3),
 *    donde el verificador ya asienta si cada atributo es consistente
 *    contra el vehículo real presente en la visita.
 *  - situación legal: del resultado de la consulta REPUVE más reciente.
 *  - identidad: del resultado de la consulta INE más reciente.
 *  - licencia: del resultado de la consulta a licencia estatal más
 *    reciente (`result_data.expired` distingue "expired" de "mismatch",
 *    ya que el enum de `result` de external-verification no lo distingue).
 */

const latestByCheckType = (externalVerifications, checkType, sourceName) => {
  const candidates = externalVerifications.filter(
    (v) =>
      v.check_type === checkType &&
      (!sourceName || v.source_name?.trim().toUpperCase() === sourceName)
  );
  return (
    candidates.sort(
      (a, b) => new Date(b.completed_at || b.createdAt) - new Date(a.completed_at || a.createdAt)
    )[0] || null
  );
};

const compareVinOrPlate = (fieldValue, repuveChecks) => {
  if (!fieldValue) return "unavailable";
  if (!repuveChecks.length) return "unavailable";
  const fieldHash = hashValue(fieldValue);
  const matched = repuveChecks.some((v) => v.query_reference_hash === fieldHash);
  return matched ? "match" : "mismatch";
};

const LEGAL_STATUS_FROM_RESULT = {
  verified: "clear",
  reported: "reported",
  not_found: "unknown",
  mismatch: "unknown",
  unavailable: "unknown",
  error: "unknown",
};

const IDENTITY_FROM_RESULT = {
  verified: "verified",
  mismatch: "mismatch",
  not_found: "unavailable",
  reported: "unavailable",
  unavailable: "unavailable",
  error: "unavailable",
};

const LICENSE_FROM_RESULT = {
  verified: "valid",
  mismatch: "mismatch",
  not_found: "mismatch",
  reported: "mismatch",
  unavailable: "unavailable",
  error: "unavailable",
};

const boolToConsistency = (value) => {
  if (value === true) return "match";
  if (value === false) return "mismatch";
  return "unavailable";
};

const computeComparisons = (driver, checklist, externalVerifications = []) => {
  const repuveChecks = externalVerifications.filter(
    (v) => v.check_type === "vehicle_theft" && v.source_name?.trim().toUpperCase() === REPUVE
  );
  const latestRepuve = latestByCheckType(externalVerifications, "vehicle_theft", REPUVE);
  const latestIne = latestByCheckType(externalVerifications, "credential", INE);
  const latestLicense = latestByCheckType(externalVerifications, "license");

  const licenseResult = latestLicense
    ? latestLicense.result_data?.expired === true
      ? "expired"
      : LICENSE_FROM_RESULT[latestLicense.result] || "unavailable"
    : "unavailable";

  return {
    vin: compareVinOrPlate(driver?.vin_number, repuveChecks),
    plates: compareVinOrPlate(driver?.license_plate, repuveChecks),
    brand: boolToConsistency(checklist?.brand_consistent),
    model: boolToConsistency(checklist?.model_consistent),
    year: boolToConsistency(checklist?.year_consistent),
    color: boolToConsistency(checklist?.color_consistent),
    legal_status: latestRepuve ? LEGAL_STATUS_FROM_RESULT[latestRepuve.result] || "unknown" : "unknown",
    identity: latestIne ? IDENTITY_FROM_RESULT[latestIne.result] || "unavailable" : "unavailable",
    license: licenseResult,
  };
};

module.exports = { computeComparisons, hashValue };

"use strict";

const crypto = require("crypto");
const { logValidationEvent } = require("../../cars-validation/services/validation-audit");

const VALIDATION_UID = "api::cars-validation.cars-validation";
const EXTERNAL_VERIFICATION_UID = "api::external-verification.external-verification";
const EVIDENCE_UID = "api::cars-evidence.cars-evidence";
const LICENSE_CATALOG_UID = "api::license-catalog.license-catalog";

const ENTITY_TYPES = ["driver", "vehicle", "license"];
const RESULTS = ["verified", "not_found", "reported", "mismatch", "unavailable", "error"];

// docs/TAXIS-VERIFICACION-CONDUCTORES-FASES.md, Fase 5 (sección 22): una
// fuente no disponible no equivale a fraude, así que no se marca "suspicious".
const RESULT_TO_STATUS = {
  verified: "valid",
  unavailable: "valid",
  not_found: "suspicious",
  reported: "suspicious",
  mismatch: "suspicious",
  error: "failed",
};

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

/** Nunca se guarda el dato consultado en claro (folio, VIN, credencial). */
const maskReference = (reference) => {
  const value = String(reference);
  if (value.length <= 4) return "*".repeat(value.length);
  return `${"*".repeat(value.length - 4)}${value.slice(-4)}`;
};

/**
 * Aplica las reglas de negocio del MVP (Fase 4) sobre la fuente/método:
 * - INE: sin convenio institucional no existe una API real (SVCV) — solo
 *   "Valida INE-QR" (app) o verificación visual presencial (web).
 * - REPUVE: el MVP solo soporta consulta manual al portal oficial
 *   (official_web) — no se asume scraping ni API pública.
 * - Licencias: el proveedor debe existir en el catálogo por entidad
 *   federativa y estar habilitado.
 * Devuelve el `source_type` resuelto cuando el llamador no lo especifica.
 */
const resolveSourceRules = async (strapi, { sourceName, verificationMethod, checkType, sourceType }) => {
  const normalizedSource = sourceName.trim().toUpperCase();

  if (normalizedSource === "INE") {
    if (verificationMethod === "api") {
      throw badRequest(
        "No existe convenio institucional con el INE para usar el SVCV vía API en este MVP. Usa 'Valida INE-QR' (verification_method=app) o verificación visual (web)."
      );
    }
    return sourceType || (verificationMethod === "app" ? "official_app" : "official_web");
  }

  if (normalizedSource === "REPUVE") {
    if (verificationMethod !== "web") {
      throw badRequest(
        "El MVP solo soporta la consulta manual de REPUVE vía el portal oficial (verification_method=web) — no se asume scraping ni API pública."
      );
    }
    return sourceType || "official_web";
  }

  if (checkType === "license") {
    const [catalogEntry] = await strapi.entityService.findMany(LICENSE_CATALOG_UID, {
      filters: { license_provider: sourceName },
      limit: 1,
    });
    if (!catalogEntry) {
      throw badRequest(
        `No hay catálogo configurado para el proveedor de licencias "${sourceName}". Regístralo primero en license-catalog.`
      );
    }
    if (!catalogEntry.verification_enabled) {
      throw badRequest(`La verificación de licencias para "${sourceName}" está deshabilitada en el catálogo.`);
    }
    return sourceType || catalogEntry.method;
  }

  if (!sourceType) {
    throw badRequest("source_type es requerido para esta fuente.");
  }
  return sourceType;
};

const registerExternalVerification = async (
  strapi,
  {
    validationId,
    entityType,
    entityId,
    sourceName,
    sourceType,
    verificationMethod,
    checkType,
    queryReference,
    result,
    resultData,
    evidenceId,
    performedById,
  }
) => {
  if (!validationId) throw badRequest("validationId es requerido.");
  if (!ENTITY_TYPES.includes(entityType)) throw badRequest("entity_type inválido.");
  if (!entityId) throw badRequest("entity_id es requerido.");
  if (!sourceName) throw badRequest("source_name es requerido.");
  if (!verificationMethod) throw badRequest("verification_method es requerido.");
  if (!checkType) throw badRequest("check_type es requerido.");
  if (!RESULTS.includes(result)) throw badRequest("result inválido.");

  const validation = await strapi.entityService.findOne(VALIDATION_UID, validationId);
  if (!validation) throw notFound("Validación no encontrada.");

  const resolvedSourceType = await resolveSourceRules(strapi, {
    sourceName,
    verificationMethod,
    checkType,
    sourceType,
  });

  if (evidenceId) {
    const evidence = await strapi.entityService.findOne(EVIDENCE_UID, evidenceId);
    if (!evidence) throw badRequest("La evidencia (evidenceId) no existe.");
    if (evidence.type !== "official_query_capture") {
      throw badRequest(
        'La evidencia adjunta debe ser de type "official_query_capture" (constancia visual de la consulta) — no una foto genérica.'
      );
    }
  }

  const now = new Date();
  const queryReferenceHash = queryReference
    ? crypto.createHash("sha256").update(String(queryReference)).digest("hex")
    : null;
  const queryReferenceMasked = queryReference ? maskReference(queryReference) : null;
  const resultHash = resultData
    ? crypto.createHash("sha256").update(JSON.stringify(resultData)).digest("hex")
    : null;

  const status = RESULT_TO_STATUS[result] || "suspicious";

  const externalVerification = await strapi.entityService.create(EXTERNAL_VERIFICATION_UID, {
    data: {
      validation: validationId,
      entity_type: entityType,
      entity_id: entityId,
      source_name: sourceName,
      source_type: resolvedSourceType,
      verification_method: verificationMethod,
      check_type: checkType,
      query_reference_hash: queryReferenceHash,
      query_reference_masked: queryReferenceMasked,
      requested_at: now,
      completed_at: now,
      result,
      result_data: resultData || null,
      result_hash: resultHash,
      evidence: evidenceId || null,
      performed_by: performedById || null,
      status,
    },
  });

  await logValidationEvent(strapi, {
    validationId,
    evidenceId: evidenceId || null,
    actorId: performedById,
    action: "external_verification_registered",
    payload: { sourceName, checkType, result, status },
  });

  return externalVerification;
};

module.exports = { registerExternalVerification, RESULT_TO_STATUS, maskReference };

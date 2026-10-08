"use strict";

/**
 * docs/TAXIS-VERIFICACION-CONDUCTORES-FASES.md, Fase 3 (sección 20):
 * checklist físico mínimo, como JSON estructurado y versionado — no texto
 * libre. `updateValidationChecklist` (validation-review.js) usa este
 * validador en vez de aceptar cualquier JSON.
 */

const CHECKLIST_VERSION = 1;

const BOOLEAN_FIELDS = [
  "driver_present",
  "identity_document_present",
  "identity_consistent",
  "license_present",
  "license_consistent",
  "vehicle_present",
  "plates_consistent",
  "vin_consistent",
  "brand_consistent",
  "model_consistent",
  "year_consistent",
  "color_consistent",
  "lights_ok",
  "tires_ok",
  "belts_ok",
  "insurance_document_present",
  "registration_present",
  "video_complete",
];

const invalid = (message) => {
  const error = new Error(message);
  error.status = 400;
  return error;
};

const validateIncident = (incident, index) => {
  if (!incident || typeof incident !== "object" || Array.isArray(incident)) {
    throw invalid(`incidents[${index}] debe ser un objeto.`);
  }
  if (!incident.description || typeof incident.description !== "string") {
    throw invalid(`incidents[${index}].description es requerido.`);
  }
  return {
    type: typeof incident.type === "string" ? incident.type : "other",
    description: incident.description,
    evidence_id:
      incident.evidence_id !== undefined && incident.evidence_id !== null
        ? Number(incident.evidence_id)
        : null,
    recorded_at: incident.recorded_at || new Date().toISOString(),
  };
};

/**
 * Valida un checklist parcial (solo los campos que el verificador ya llenó)
 * y lo fusiona sobre el checklist previo, sin aceptar llaves desconocidas.
 */
const mergeAndValidateChecklist = (previousChecklist, incomingChecklist) => {
  const previous =
    previousChecklist && typeof previousChecklist === "object"
      ? previousChecklist
      : {};

  if (
    incomingChecklist === undefined ||
    incomingChecklist === null ||
    typeof incomingChecklist !== "object" ||
    Array.isArray(incomingChecklist)
  ) {
    throw invalid("checklist debe ser un objeto.");
  }

  const allowedKeys = new Set([...BOOLEAN_FIELDS, "incidents", "version"]);
  const unknownKeys = Object.keys(incomingChecklist).filter(
    (key) => !allowedKeys.has(key)
  );
  if (unknownKeys.length) {
    throw invalid(`Campos de checklist no reconocidos: ${unknownKeys.join(", ")}`);
  }

  const merged = { ...previous };

  for (const field of BOOLEAN_FIELDS) {
    if (incomingChecklist[field] === undefined) continue;
    if (typeof incomingChecklist[field] !== "boolean") {
      throw invalid(`checklist.${field} debe ser boolean.`);
    }
    merged[field] = incomingChecklist[field];
  }

  if (incomingChecklist.incidents !== undefined) {
    if (!Array.isArray(incomingChecklist.incidents)) {
      throw invalid("checklist.incidents debe ser un arreglo.");
    }
    merged.incidents = incomingChecklist.incidents.map(validateIncident);
  } else if (!Array.isArray(merged.incidents)) {
    merged.incidents = [];
  }

  merged.version = CHECKLIST_VERSION;

  return merged;
};

module.exports = {
  CHECKLIST_VERSION,
  BOOLEAN_FIELDS,
  mergeAndValidateChecklist,
};

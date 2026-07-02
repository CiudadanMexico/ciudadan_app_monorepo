"use strict";

/**
 * Maps driver media fields to cars_evidence.type values.
 * allowMany: one evidence record per file when true.
 */
const DRIVER_EVIDENCE_MAP = [
  { field: "profile_pic", type: "profile_photo", allowMany: false },
  { field: "verification_selfie", type: "selfie_live", allowMany: false },
  { field: "id_front", type: "id_front", allowMany: false },
  { field: "id_back", type: "id_back", allowMany: false },
  { field: "driver_license_front", type: "license_front", allowMany: false },
  { field: "driver_license_back", type: "license_back", allowMany: false },
  { field: "proof_of_address", type: "proof_of_address", allowMany: true },
  { field: "vehicle_front_photo", type: "vehicle_front", allowMany: true },
  { field: "vehicle_side_photo", type: "vehicle_left", allowMany: true },
  { field: "vehicle_back_photo", type: "vehicle_back", allowMany: true },
  { field: "vehicle_interior_photo", type: "interior", allowMany: true },
  {
    field: "vehicle_registration_card",
    type: "registration_card",
    allowMany: true,
  },
  {
    field: "vehicle_insurance_document",
    type: "insurance_document",
    allowMany: true,
  },
];

const ACTIVE_VALIDATION_STATUSES = [
  "pending",
  "active",
  "under_review",
  "awaiting_resubmission",
];

const DRIVER_MEDIA_POPULATE = DRIVER_EVIDENCE_MAP.reduce((acc, { field }) => {
  acc[field] = true;
  return acc;
}, {});

const normalizeMediaEntry = (entry) => {
  if (!entry) return null;
  const raw = entry?.data !== undefined ? entry.data : entry;
  const item = Array.isArray(raw) ? raw[0] : raw;
  if (!item) return null;
  const attrs = item.attributes || item;
  const id = item.id ?? attrs?.id;
  if (!id) return null;
  return { id: Number(id), ...attrs };
};

const toMediaList = (field) => {
  if (!field) return [];
  const raw = field?.data !== undefined ? field.data : field;
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map(normalizeMediaEntry).filter(Boolean);
};

const getRelationId = (relation) => {
  if (!relation) return null;
  if (typeof relation === "number" || typeof relation === "string")
    return Number(relation);
  return relation.id ?? relation.data?.id ?? null;
};

const mergeAgendaMetadata = (agenda, validationId, driverId) => {
  const current =
    agenda.metadata && typeof agenda.metadata === "object"
      ? agenda.metadata
      : {};
  const preregistro = current.preregistro_conductor || {};

  return {
    ...current,
    validation_id: validationId,
    preregistro_conductor: {
      ...preregistro,
      driver_id: driverId ?? preregistro.driver_id ?? null,
      validation_id: validationId,
    },
  };
};

module.exports = {
  DRIVER_EVIDENCE_MAP,
  DRIVER_MEDIA_POPULATE,
  ACTIVE_VALIDATION_STATUSES,
  toMediaList,
  getRelationId,
  mergeAgendaMetadata,
};

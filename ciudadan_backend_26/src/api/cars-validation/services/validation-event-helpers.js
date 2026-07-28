"use strict";

const EVIDENCE_TYPE_LABELS = {
  selfie_live: "Selfie verificación",
  id_front: "INE — frente",
  id_back: "INE — reverso",
  license_front: "Licencia — frente",
  license_back: "Licencia — reverso",
  proof_of_address: "Comprobante domicilio",
  profile_photo: "Foto de perfil",
  vehicle_front: "Foto vehículo — frente",
  vehicle_back: "Foto vehículo — trasera",
  vehicle_left: "Foto vehículo — lateral",
  vehicle_right: "Foto vehículo — lateral derecha",
  registration_card: "Tarjeta de circulación",
  insurance_document: "Seguro del vehículo",
  interior: "Foto vehículo — interior",
  plates: "Placas",
  vin: "VIN",
  trunk: "Cajuela",
  video_360: "Video 360",
};

const VALIDATION_STATUS_LABELS = {
  pending: "Pendiente",
  active: "Activa",
  under_review: "En revisión",
  completed: "Completada",
  expired: "Expirada",
  cancelled: "Cancelada",
};

const getEvidenceLabel = (evidence) => {
  if (!evidence) return "Documento";
  const type = evidence.type || "other";
  const base = EVIDENCE_TYPE_LABELS[type] || type;
  const version = Number(evidence.version) > 1 ? ` (v${evidence.version})` : "";
  return `${base}${version}`;
};

const buildEvidenceEventPayload = (
  evidence,
  { previousStatus, newStatus, reviewerNote, extra = {} } = {}
) => ({
  evidence_id: evidence?.id ?? null,
  evidence_type: evidence?.type ?? null,
  evidence_label: getEvidenceLabel(evidence),
  previous_status: previousStatus ?? null,
  new_status: newStatus ?? null,
  reviewer_note: reviewerNote || null,
  ...extra,
});

const buildValidationStatusPayload = ({
  previousStatus,
  newStatus,
  result,
  action = null,
  extra = {},
}) => ({
  previous_status: previousStatus ?? null,
  new_status: newStatus ?? null,
  previous_status_label:
    VALIDATION_STATUS_LABELS[previousStatus] || previousStatus,
  new_status_label: VALIDATION_STATUS_LABELS[newStatus] || newStatus,
  result: result ?? null,
  action: action ?? null,
  ...extra,
});

const buildObservationsPayload = ({
  previousObservations,
  newObservations,
}) => ({
  previous_observations: previousObservations ?? "",
  new_observations: newObservations ?? "",
  changed: String(previousObservations || "") !== String(newObservations || ""),
});

module.exports = {
  EVIDENCE_TYPE_LABELS,
  VALIDATION_STATUS_LABELS,
  getEvidenceLabel,
  buildEvidenceEventPayload,
  buildValidationStatusPayload,
  buildObservationsPayload,
};

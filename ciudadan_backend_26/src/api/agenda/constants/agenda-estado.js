"use strict";

/**
 * Estados operativos de agenda (citas preregistro conductor).
 * Campo canónico en BD: agendas.estado (enumeration).
 */
const AGENDA_ESTADO = {
  PENDING: "pendiente",
  IN_REVIEW: "en_revision",
  RESUBMIT_FILES: "resubir_archivos",
  COMPLETED: "completada",
  CANCELLED: "cancelada",
  EXPIRED: "expirada",
};

const AGENDA_ESTADO_VALUES = Object.values(AGENDA_ESTADO);

const AGENDA_ESTADO_LABELS = {
  [AGENDA_ESTADO.PENDING]: "Pendiente",
  [AGENDA_ESTADO.IN_REVIEW]: "En revisión",
  [AGENDA_ESTADO.RESUBMIT_FILES]: "Resubir archivos",
  [AGENDA_ESTADO.COMPLETED]: "Completada",
  [AGENDA_ESTADO.CANCELLED]: "Cancelada",
  [AGENDA_ESTADO.EXPIRED]: "Expirada",
};

/** Estados en los que la cita sigue visible en cola operativa del admin. */
const AGENDA_ESTADO_ACTIVE_QUEUE = [
  AGENDA_ESTADO.PENDING,
  AGENDA_ESTADO.IN_REVIEW,
  AGENDA_ESTADO.RESUBMIT_FILES,
];

const normalizeAgendaEstado = (value, fallback = AGENDA_ESTADO.PENDING) => {
  const key = String(value ?? "").trim();
  return AGENDA_ESTADO_VALUES.includes(key) ? key : fallback;
};

module.exports = {
  AGENDA_ESTADO,
  AGENDA_ESTADO_VALUES,
  AGENDA_ESTADO_LABELS,
  AGENDA_ESTADO_ACTIVE_QUEUE,
  normalizeAgendaEstado,
};

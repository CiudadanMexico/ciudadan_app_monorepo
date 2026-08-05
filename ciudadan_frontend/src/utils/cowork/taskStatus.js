// src/utils/cowork/taskStatus.js

/**
 * Gestiona los estados de tarea según la especificación PDF.
 * Convierte estados de Strapi a estados legibles y valida transiciones.
 */

export const TASK_STATUS = {
  DRAFT: 'borrador',
  PUBLISHED: 'publicada',
  ASSIGNED: 'asignada',
  IN_PROGRESS: 'en_proceso',
  PENDING_REVISION: 'pendiente_revision',
  CORRECTING: 'corregir',
  CORRECTED: 'corregida',
  RATED: 'calificada',
  PAID: 'pagada',
  CANCELLED: 'cancelada',
  MODIFIED: 'modificada'
};

export const getStatusLabel = (status) => {
  const labels = {
    [TASK_STATUS.DRAFT]: 'Borrador',
    [TASK_STATUS.PUBLISHED]: 'Publicada',
    [TASK_STATUS.ASSIGNED]: 'Asignada',
    [TASK_STATUS.IN_PROGRESS]: 'En proceso',
    [TASK_STATUS.PENDING_REVISION]: 'Pendiente de revisión',
    [TASK_STATUS.CORRECTING]: 'En corrección',
    [TASK_STATUS.CORRECTED]: 'Corregida',
    [TASK_STATUS.RATED]: 'Calificada',
    [TASK_STATUS.PAID]: 'Pagada',
    [TASK_STATUS.CANCELLED]: 'Cancelada',
    [TASK_STATUS.MODIFIED]: 'Modificada'
  };
  return labels[status] || status;
};

export const isValidTransition = (from, to) => {
  const transitions = {
    [TASK_STATUS.DRAFT]: [TASK_STATUS.PUBLISHED, TASK_STATUS.CANCELLED],
    [TASK_STATUS.PUBLISHED]: [TASK_STATUS.ASSIGNED, TASK_STATUS.CANCELLED],
    [TASK_STATUS.ASSIGNED]: [TASK_STATUS.IN_PROGRESS, TASK_STATUS.CANCELLED],
    [TASK_STATUS.IN_PROGRESS]: [TASK_STATUS.PENDING_REVISION, TASK_STATUS.CANCELLED],
    [TASK_STATUS.PENDING_REVISION]: [TASK_STATUS.CORRECTING],
    [TASK_STATUS.CORRECTING]: [TASK_STATUS.CORRECTED],
    [TASK_STATUS.CORRECTED]: [TASK_STATUS.RATED],
    [TASK_STATUS.RATED]: [TASK_STATUS.PAID],
    [TASK_STATUS.PAID]: [],
    [TASK_STATUS.CANCELLED]: [],
    [TASK_STATUS.MODIFIED]: [TASK_STATUS.PUBLISHED]
  };
  
  return transitions[from] ? transitions[from].includes(to) : false;
};

export const getNextPossibleStatuses = (currentStatus) => {
  const transitions = {
    [TASK_STATUS.DRAFT]: [TASK_STATUS.PUBLISHED, TASK_STATUS.CANCELLED],
    [TASK_STATUS.PUBLISHED]: [TASK_STATUS.ASSIGNED, TASK_STATUS.CANCELLED],
    [TASK_STATUS.ASSIGNED]: [TASK_STATUS.IN_PROGRESS, TASK_STATUS.CANCELLED],
    [TASK_STATUS.IN_PROGRESS]: [TASK_STATUS.PENDING_REVISION, TASK_STATUS.CANCELLED],
    [TASK_STATUS.PENDING_REVISION]: [TASK_STATUS.CORRECTING],
    [TASK_STATUS.CORRECTING]: [TASK_STATUS.CORRECTED],
    [TASK_STATUS.CORRECTED]: [TASK_STATUS.RATED],
    [TASK_STATUS.RATED]: [TASK_STATUS.PAID],
    [TASK_STATUS.PAID]: [],
    [TASK_STATUS.CANCELLED]: [],
    [TASK_STATUS.MODIFIED]: [TASK_STATUS.PUBLISHED]
  };
  
  return transitions[currentStatus] || [];
};

export const isTaskEditable = (status) => {
  return [
    TASK_STATUS.DRAFT,
    TASK_STATUS.PUBLISHED,
    TASK_STATUS.MODIFIED
  ].includes(status);
};

export const isTaskCompletable = (status) => {
  return status === TASK_STATUS.IN_PROGRESS;
};

export const isTaskReviewable = (status) => {
  return status === TASK_STATUS.PENDING_REVISION;
};

export const isTaskRateable = (status) => {
  return status === TASK_STATUS.CORRECTED;
};

export const isTaskPayable = (status) => {
  return status === TASK_STATUS.RATED;
};
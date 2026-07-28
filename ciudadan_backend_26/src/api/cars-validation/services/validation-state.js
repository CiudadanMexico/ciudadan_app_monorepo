'use strict';

const ACTIVE_VALIDATION_STATUSES = [
  'pending',
  'active',
  'under_review',
  'awaiting_resubmission',
];

const UI_TO_REVIEW_STATUS = {
  approved: 'approved',
  rejected: 'rejected',
  resub_requested: 'resub_requested',
  needs_review: 'needs_review',
  pending: 'pending',
};

const REVIEW_ACTION_TO_EVENT = {
  approved: 'evidence_approved',
  rejected: 'evidence_rejected',
  resub_requested: 'evidence_resub_requested',
  needs_review: 'evidence_resub_requested',
};

const getCurrentEvidences = (evidences = []) =>
  evidences.filter((evidence) => evidence.is_current !== false);

const evaluateCompletion = (evidences = []) => {
  const current = getCurrentEvidences(evidences);

  if (!current.length) {
    return { canApprove: false, reason: 'Sin evidencias para revisar.' };
  }

  const pending = current.filter((evidence) =>
    ['pending', 'needs_review'].includes(evidence.review_status)
  );

  if (pending.length) {
    return { canApprove: false, reason: 'Hay documentos pendientes de revisión.' };
  }

  const rejected = current.filter((evidence) => evidence.review_status === 'rejected');
  const resub = current.filter((evidence) => evidence.review_status === 'resub_requested');

  if (rejected.length) {
    return {
      canApprove: false,
      canReject: true,
      canRequestResub: true,
      suggestedResult: 'rejected',
      driverStatus: 'rejected',
    };
  }

  if (resub.length) {
    return {
      canApprove: false,
      canReject: true,
      canRequestResub: true,
      suggestedResult: 'manual_review',
      driverStatus: 'documents_rejected',
      validationStatus: 'under_review',
    };
  }

  const allApproved = current.every((evidence) => evidence.review_status === 'approved');
  if (allApproved) {
    return {
      canApprove: true,
      canReject: true,
      canRequestResub: true,
      suggestedResult: 'approved',
      driverStatus: 'approved',
    };
  }

  return { canApprove: false, reason: 'Estado documental inconsistente.' };
};

const mapCompleteAction = (action, evidences) => {
  const current = getCurrentEvidences(evidences);
  const evaluation = evaluateCompletion(current);

  if (action === 'approve') {
    if (!evaluation.canApprove) {
      const error = new Error(evaluation.reason || 'No se puede aprobar la validación.');
      error.status = 400;
      throw error;
    }
    return {
      validationStatus: 'completed',
      validationResult: 'approved',
      driverStatus: 'approved',
      inPersonVerificationCompleted: true,
      finalApproval: true,
    };
  }

  if (action === 'reject') {
    return {
      validationStatus: 'completed',
      validationResult: 'rejected',
      driverStatus: 'rejected',
      inPersonVerificationCompleted: false,
      finalApproval: false,
    };
  }

  if (action === 'request_resub') {
    return {
      validationStatus: 'awaiting_resubmission',
      validationResult: 'resubmission_required',
      driverStatus: 'documents_rejected',
      inPersonVerificationCompleted: false,
      finalApproval: false,
      markResubEvidenceIds: current
        .filter((evidence) => evidence.review_status !== 'approved')
        .map((evidence) => evidence.id),
      enterResubmissionMode: true,
    };
  }

  const error = new Error('Acción de cierre no soportada.');
  error.status = 400;
  throw error;
};

module.exports = {
  ACTIVE_VALIDATION_STATUSES,
  UI_TO_REVIEW_STATUS,
  REVIEW_ACTION_TO_EVENT,
  getCurrentEvidences,
  evaluateCompletion,
  mapCompleteAction,
};

const PENDING_REVIEW_STATUSES = ['pending', 'needs_review'];
const REVIEWED_STATUSES = ['approved', 'rejected', 'resub_requested'];

const pct = (current, total) => {
  if (!total) return 0;
  return Math.round((current / total) * 100);
};

const countByStatus = (documents, statuses) =>
  documents.filter((doc) => statuses.includes(doc.status)).length;

/**
 * Métricas de revisión documental basadas en evidencias (cars_evidences) en UI.
 * Fuente de verdad: lista de documentos mapeados con `status` por evidencia.
 */
export const computeEvidenceReviewMetrics = (documents = []) => {
  const total = documents.length;
  const approved = countByStatus(documents, ['approved']);
  const reviewed = countByStatus(documents, REVIEWED_STATUSES);
  const pendingReview = countByStatus(documents, PENDING_REVIEW_STATUSES);

  const identityDocs = documents.filter((doc) => doc.type === 'identity' || doc.type === 'license');
  const vehicleDocs = documents.filter((doc) => doc.type === 'vehicle');

  const score = {
    identity: pct(
      identityDocs.filter((doc) => doc.status === 'approved').length,
      identityDocs.length || 1
    ),
    docs: pct(approved, total || 1),
    vehicle: pct(
      vehicleDocs.filter((doc) => doc.status === 'approved').length,
      vehicleDocs.length || 1
    ),
  };
  score.overall = Math.round((score.identity + score.docs + score.vehicle) / 3);

  return {
    docsProgress: { completed: approved, total, reviewed },
    score,
    pendingReview,
    canApprove: total > 0 && pendingReview === 0 && approved === total,
  };
};

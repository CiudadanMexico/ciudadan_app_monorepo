'use strict';

/**
 * Maquina de estados del expediente de repartidor (spec §5 + §12D).
 *
 *   draft -> pending_documents -> pending_review
 *   draft | pending_documents | corrections_required -> pending_review (enviar/reenviar)
 *   pending_review -> corrections_required | eligible_for_video_review | rejected
 *   pending_review | corrections_required | eligible_for_video_review -> pending_federal_audit (senal alta)
 *   pending_federal_audit -> pending_review | eligible_for_video_review (resolucion federal)
 *   eligible_for_video_review -> approved (acto explicito tras validacion Zoom)
 *   approved -> suspended (motivada) ; suspended -> approved (solo revalidacion autorizada)
 *   rejected -> pending_review (reapertura por revisor, con motivo)
 *
 * `approved` (cualificacion) y el bloqueo operativo (`suspended`) viven en el
 * MISMO campo de estado: el rol repartidor se conserva durante la suspension
 * (spec §8, recomendacion) y las APIs futuras deben exigir rol Y estado.
 */

const ESTADOS = [
  'draft',
  'pending_documents',
  'pending_review',
  'corrections_required',
  'eligible_for_video_review',
  'pending_federal_audit',
  'approved',
  'rejected',
  'suspended',
];

const TRANSICIONES_VALIDAS = {
  draft: ['pending_documents', 'pending_review'],
  pending_documents: ['pending_review'],
  pending_review: ['corrections_required', 'eligible_for_video_review', 'rejected', 'pending_federal_audit'],
  corrections_required: ['pending_review', 'pending_federal_audit'],
  eligible_for_video_review: ['approved', 'corrections_required', 'rejected', 'pending_federal_audit'],
  pending_federal_audit: ['pending_review', 'eligible_for_video_review'],
  approved: ['suspended'],
  suspended: ['approved'],
  rejected: ['pending_review'],
};

/** Estados en los que el SOLICITANTE puede editar campos/vehiculo/evidencias. */
const ESTADOS_EDITABLES_SOLICITANTE = ['draft', 'pending_documents', 'corrections_required'];

/** Estados con decision de la agencia pendiente (revisables por socio/admin/root). */
const ESTADOS_EN_REVISION = ['pending_review', 'corrections_required', 'eligible_for_video_review'];

function esEstadoValido(estado) {
  return ESTADOS.includes(estado);
}

function puedeTransicionar(de, a) {
  if (!esEstadoValido(de) || !esEstadoValido(a)) return false;
  return (TRANSICIONES_VALIDAS[de] || []).includes(a);
}

/** Lanza Error plano status 400 si la transicion no es valida (convencion del repo). */
function assertTransicion(de, a) {
  if (!puedeTransicionar(de, a)) {
    const error = new Error(
      `Transicion de estado invalida para el expediente de repartidor: ${de} -> ${a}`
    );
    error.status = 400;
    error.expose = true;
    throw error;
  }
  return true;
}

module.exports = {
  ESTADOS,
  TRANSICIONES_VALIDAS,
  ESTADOS_EDITABLES_SOLICITANTE,
  ESTADOS_EN_REVISION,
  esEstadoValido,
  puedeTransicionar,
  assertTransicion,
};

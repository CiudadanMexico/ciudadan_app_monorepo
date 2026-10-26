'use strict';

/**
 * Vocabulario de acciones de la bitacora (delivery-verification-event).
 * El campo `action` del schema es string (no enum) para no migrar el schema
 * en cada accion nueva, pero el vocabulario esta controlado AQUI y los
 * servicios solo escriben acciones de esta lista.
 */

const ACCIONES = Object.freeze({
  // Ciclo del solicitante
  APLICACION_INICIADA: 'application_started',
  EXPEDIENTE_ACTUALIZADO: 'profile_updated',
  VEHICULO_REGISTRADO: 'vehicle_registered',
  VEHICULO_CLASIFICADO: 'vehicle_classified',
  EVIDENCIA_ADJUNTADA: 'evidence_attached',
  IDENTIDAD_REUTILIZADA: 'identity_reused_from_user',
  ENVIADO_A_REVISION: 'submitted',
  // Revision de agencia
  COTEJO_REGISTRADO: 'document_check_registered',
  CORRECCIONES_SOLICITADAS: 'corrections_requested',
  MARCADO_ELEGIBLE_VIDEO: 'marked_video_eligible',
  VALIDACION_ZOOM_REGISTRADA: 'video_validation_registered',
  APROBADO: 'approved',
  RECHAZADO: 'rejected',
  SUSPENDIDO: 'suspended',
  REVALIDADO: 'revalidated',
  // Rol
  ROL_OTORGADO: 'role_granted',
  ROL_OTORGADO_IDEMPOTENTE: 'role_grant_skipped_idempotent',
  ROL_OTORGAMIENTO_FALLIDO: 'role_grant_failed',
  // Riesgo y federal
  SENAL_REGISTRADA: 'risk_signal_raised',
  BLOQUEO_FEDERAL: 'federal_block_activated',
  RESOLUCION_FEDERAL: 'federal_resolved',
  REABIERTO: 'reopened',
});

function esAccionValida(accion) {
  return Object.values(ACCIONES).includes(accion);
}

module.exports = { ACCIONES, esAccionValida };

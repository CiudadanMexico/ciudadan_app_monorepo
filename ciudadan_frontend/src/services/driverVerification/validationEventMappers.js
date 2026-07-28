import dayjs from 'dayjs';

const EVIDENCE_TYPE_LABELS = {
  selfie_live: 'Selfie verificación',
  id_front: 'INE — frente',
  id_back: 'INE — reverso',
  license_front: 'Licencia — frente',
  license_back: 'Licencia — reverso',
  proof_of_address: 'Comprobante domicilio',
  profile_photo: 'Foto de perfil',
  vehicle_front: 'Foto vehículo — frente',
  vehicle_back: 'Foto vehículo — trasera',
  vehicle_left: 'Foto vehículo — lateral',
  vehicle_right: 'Foto vehículo — lateral derecha',
  registration_card: 'Tarjeta de circulación',
  insurance_document: 'Seguro del vehículo',
  interior: 'Foto vehículo — interior',
  plates: 'Placas',
  vin: 'VIN',
  trunk: 'Cajuela',
  video_360: 'Video 360',
};

const VALIDATION_STATUS_LABELS = {
  pending: 'pendiente',
  active: 'activa',
  under_review: 'en revisión',
  awaiting_resubmission: 'esperando reenvío',
  completed: 'completada',
  expired: 'expirada',
  cancelled: 'cancelada',
};

const getEvidenceLabelFromEvent = (event, payload) => {
  if (payload?.evidence_label) return payload.evidence_label;
  const evidence = event?.evidence;
  if (!evidence) return null;
  const type = evidence.type || evidence.attributes?.type;
  const version = evidence.version || evidence.attributes?.version;
  const base = EVIDENCE_TYPE_LABELS[type] || type;
  if (!base) return null;
  return version > 1 ? `${base} (v${version})` : base;
};

const getTimelineType = (action) => {
  if (!action) return 'info';
  if (action.includes('reject') || action === 'validation_cancelled') return 'rejected';
  if (action.includes('approv') || action === 'validation_completed') return 'approved';
  if (action.includes('resub') || action.includes('superseded') || action === 'evidence_synced')
    return 'resub';
  if (action === 'validation_status_changed' || action === 'observations_updated') return 'info';
  return 'info';
};

const buildEventDescription = (action, payload = {}, event = {}) => {
  const label = getEvidenceLabelFromEvent(event, payload);

  switch (action) {
    case 'evidence_approved':
      return label ? `Se aprobó ${label}` : 'Se aprobó un documento';
    case 'evidence_rejected':
      return label ? `Se rechazó ${label}` : 'Se rechazó un documento';
    case 'evidence_resub_requested':
      return label ? `Se solicitó recarga de ${label}` : 'Se solicitó recarga de documento';
    case 'evidence_superseded':
      return label ? `Se reemplazó ${label}` : 'Se reemplazó un documento';
    case 'evidence_synced': {
      const created = payload.createdEvidenceIds?.length || payload.createdEvidenceCount || 0;
      const superseded = payload.supersededEvidenceIds?.length || 0;
      if (created && superseded) {
        return `Se sincronizaron documentos (${created} nuevos, ${superseded} reemplazados)`;
      }
      if (created) return `Se cargaron ${created} documento(s) nuevo(s)`;
      return 'Se sincronizaron documentos del conductor';
    }
    case 'observations_updated':
      if (payload.changed === false) return 'Observaciones guardadas sin cambios';
      return label
        ? `Se agregó observación sobre ${label}`
        : 'Se actualizaron las observaciones del revisor';
    case 'validation_status_changed': {
      const prev =
        payload.previous_status_label || VALIDATION_STATUS_LABELS[payload.previous_status];
      const next = payload.new_status_label || VALIDATION_STATUS_LABELS[payload.new_status];
      if (prev && next) return `Validación actualizada de ${prev} a ${next}`;
      return 'Se actualizó el estado de la validación';
    }
    case 'resubmission_requested': {
      const count = payload.required_document_types?.length || 0;
      if (count) return `Se solicitó reenvío de ${count} documento(s)`;
      return 'Se solicitó reenvío de documentos al conductor';
    }
    case 'validation_completed': {
      const result = payload.result || payload.status;
      if (result === 'rejected') return 'Validación completada — conductor rechazado';
      if (result === 'approved_with_observations') {
        return 'Validación completada — aprobada con observaciones';
      }
      if (result === 'approved') return 'Validación completada — conductor aprobado';
      if (result === 'resubmission_required' || payload.status === 'awaiting_resubmission') {
        return 'Se solicitó reenvío de documentos al conductor';
      }
      if (payload.status === 'under_review') return 'Se solicitó reenvío de documentos';
      return 'Validación completada';
    }
    case 'validation_created':
      return 'Validación creada desde la cita';
    case 'agenda_synced': {
      const estado = payload.agendaEstado;
      const labels = {
        pendiente: 'pendiente',
        en_revision: 'en revisión',
        resubir_archivos: 'resubir archivos',
        completada: 'completada',
        cancelada: 'cancelada',
        expirada: 'expirada',
      };
      return `Cita actualizada a ${labels[estado] || estado || 'estado sincronizado'}`;
    }
    case 'driver_status_synced':
      return `Estado del conductor actualizado a ${payload.status || 'nuevo estado'}`;
    case 'checklist_updated':
      return 'Checklist operativo actualizado';
    default:
      return null;
  }
};

const unwrap = (value) => {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map(unwrap).filter(Boolean);
  if (value?.data !== undefined) return unwrap(value.data);
  if (value?.attributes) return { id: value.id, ...value.attributes };
  return value;
};

const unwrapList = (value) => {
  const unwrapped = unwrap(value);
  if (!unwrapped) return [];
  return Array.isArray(unwrapped) ? unwrapped : [unwrapped];
};

const formatEventTime = (value) => {
  if (!value) return '—';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('D MMM YYYY HH:mm') : '—';
};

/**
 * Mapea cars_validation_events al timeline de la UI.
 * Fuente de verdad: entidad cars_validation_event (+ relaciones actor/evidence).
 */
export const mapValidationEventsToTimeline = (events = []) => {
  const list = unwrapList(events)
    .map((event, index) => {
      const action = event.action;
      const payload = event.payload || {};
      const actor = unwrap(event.actor);
      const description =
        payload.message || buildEventDescription(action, payload, event) || action || 'Evento';

      let detail = '';
      if (payload.reviewer_note) {
        detail = payload.reviewer_note;
      } else if (action === 'observations_updated' && payload.new_observations) {
        detail = payload.new_observations;
      }

      return {
        id: event.id ?? `event-${index}`,
        action,
        type: getTimelineType(action),
        text: description,
        detail,
        time: formatEventTime(event.createdAt),
        timestamp: event.createdAt ? new Date(event.createdAt).getTime() : 0,
        actorName: actor?.username || actor?.email || null,
        payload,
        evidenceId: payload.evidence_id || unwrap(event.evidence)?.id || null,
      };
    })
    .sort((a, b) => b.timestamp - a.timestamp);

  return list;
};

import { mapDriverDetailsToViewModel } from './mappers';
import { computeEvidenceReviewMetrics } from './reviewProgress';
import { buildReviewNavigationSections, computeReviewSectionScores } from './reviewNavigation';
import { mapValidationEventsToTimeline } from './validationEventMappers';
import { getAgendaEstadoLabel, normalizeAgendaEstado } from '../../constants/agendaEstado';

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL || '';

const VALIDATION_STATUS_META = {
  pending: { label: 'Pendiente', color: 'warning', sectionStatus: 'pending' },
  active: { label: 'Activa', color: 'info', sectionStatus: 'needs_review' },
  under_review: { label: 'En revisión', color: 'info', sectionStatus: 'needs_review' },
  awaiting_resubmission: {
    label: 'Esperando reenvío',
    color: 'warning',
    sectionStatus: 'resub_requested',
  },
  completed: { label: 'Completada', color: 'success', sectionStatus: 'approved' },
  expired: { label: 'Expirada', color: 'default', sectionStatus: 'rejected' },
  cancelled: { label: 'Cancelada', color: 'default', sectionStatus: 'rejected' },
};

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

const EVIDENCE_CATEGORY = {
  selfie_live: 'identity',
  id_front: 'identity',
  id_back: 'identity',
  license_front: 'license',
  license_back: 'license',
  proof_of_address: 'identity',
  profile_photo: 'identity',
  vehicle_front: 'vehicle',
  vehicle_back: 'vehicle',
  vehicle_left: 'vehicle',
  vehicle_right: 'vehicle',
  registration_card: 'vehicle',
  insurance_document: 'vehicle',
  interior: 'vehicle',
  plates: 'vehicle',
  vin: 'vehicle',
  trunk: 'vehicle',
  video_360: 'vehicle',
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

const asString = (value) => String(value ?? '').trim();

const toAbsoluteUrl = (rawUrl) => {
  if (!rawUrl) return null;
  if (String(rawUrl).startsWith('http')) return rawUrl;
  const host = STRAPI_URL.replace(/\/$/, '');
  return `${host}${rawUrl}`;
};

const mapReviewStatusToUi = (reviewStatus) => {
  if (reviewStatus === 'needs_review') return 'needs_review';
  if (reviewStatus === 'resub_requested') return 'resub_requested';
  if (reviewStatus === 'approved') return 'approved';
  if (reviewStatus === 'rejected' || reviewStatus === 'superseded') return 'rejected';
  return 'pending';
};

const mapEvidenceToDocument = (evidence, index) => {
  const file = unwrap(evidence.file);
  const fileUrl = toAbsoluteUrl(file?.url);
  const type = evidence.type || 'other';
  const baseName = EVIDENCE_TYPE_LABELS[type] || type;

  return {
    id: evidence.id ?? `evidence-${index}`,
    evidenceId: evidence.id,
    sourceField: evidence.source_driver_field || type,
    type: EVIDENCE_CATEGORY[type] || 'identity',
    evidenceType: type,
    name: evidence.version > 1 ? `${baseName} (v${evidence.version})` : baseName,
    status: mapReviewStatusToUi(evidence.review_status),
    note: evidence.reviewer_note || (fileUrl ? 'Archivo cargado' : 'Sin archivo'),
    imageUrl: fileUrl,
    fileUrl,
    hasFile: Boolean(fileUrl),
    version: evidence.version || 1,
    isCurrent: evidence.is_current !== false,
    origin: evidence.origin || 'preregister',
  };
};

export const mapValidationToReviewViewModel = (validationEntity) => {
  if (!validationEntity) return null;

  const driverEntity = unwrap(validationEntity.driver);
  const driverViewModel = driverEntity ? mapDriverDetailsToViewModel(driverEntity) : null;

  const evidences = unwrapList(validationEntity.evidences).filter(
    (evidence) => evidence.is_current !== false
  );
  const documents = evidences.map((evidence, index) => mapEvidenceToDocument(evidence, index));
  const reviewMetrics = computeEvidenceReviewMetrics(documents);

  const validationStatus = asString(validationEntity.status) || 'pending';
  const statusMeta = VALIDATION_STATUS_META[validationStatus] || VALIDATION_STATUS_META.pending;

  const agency = unwrap(validationEntity.agency);
  const reviewer = unwrap(validationEntity.reviewer);
  const agenda = unwrap(validationEntity.agenda);

  const selfieDoc = documents.find((doc) => doc.evidenceType === 'selfie_live');
  const ineDoc = documents.find((doc) => doc.evidenceType === 'id_front');

  const events = mapValidationEventsToTimeline(validationEntity.events);

  return {
    validation: {
      id: String(validationEntity.id || ''),
      status: validationStatus,
      statusLabel: statusMeta.label,
      result: validationEntity.result || 'manual_review',
      appointmentDate: validationEntity.appointment_date || agenda?.fecha_inicio || null,
      agendaId: agenda?.id || validationEntity.metadata?.agenda_id || null,
      openedAt: validationEntity.opened_at || null,
      closedAt: validationEntity.closed_at || null,
    },
    driver: {
      ...(driverViewModel?.driver || {
        id: String(driverEntity?.id || ''),
        name: 'Conductor sin nombre',
        initials: '—',
        status: driverEntity?.status || 'pending_review',
        statusLabel: statusMeta.label,
        appointmentDate: validationEntity.appointment_date || null,
        branch: agency?.nombre || '—',
        profileImageUrl: null,
      }),
      reviewer: reviewer?.username || driverViewModel?.driver?.reviewer || 'Sin asignar',
      assignedAt: validationEntity.updatedAt || validationEntity.createdAt || null,
      docsProgress: reviewMetrics.docsProgress,
    },
    vehicle: driverViewModel?.vehicle || {},
    documents,
    biometric: {
      selfieUrl: selfieDoc?.imageUrl || null,
      ineUrl: ineDoc?.imageUrl || null,
      similarityScore: null,
    },
    sections: buildReviewNavigationSections({
      documents,
      driver: driverViewModel?.driver,
    }),
    score: computeReviewSectionScores(documents),
    observations: asString(validationEntity.observations),
    checklist: validationEntity.checklist || {},
    agenda: agenda
      ? {
          id: String(agenda.id || ''),
          estado: normalizeAgendaEstado(agenda.estado || agenda.status),
          estadoLabel: getAgendaEstadoLabel(agenda.estado || agenda.status),
          titulo: asString(agenda.titulo),
          ciudad: asString(agenda.ciudad),
          fechaInicio: agenda.fecha_inicio || null,
          checked: Boolean(agenda.checked),
        }
      : null,
    events,
  };
};

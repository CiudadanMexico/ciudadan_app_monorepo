import dayjs from 'dayjs';
import { normalizeEntity } from '../../utils/preRegisterForSteps/helpers';

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL || '';

const DRIVER_STATUS_META = {
  draft: { label: 'Borrador', color: 'default', sectionStatus: 'pending' },
  pending_documents: { label: 'Pendiente documentos', color: 'warning', sectionStatus: 'pending' },
  pending_appointment: { label: 'Pendiente cita', color: 'warning', sectionStatus: 'pending' },
  pending_review: { label: 'En revisión', color: 'info', sectionStatus: 'needs_review' },
  documents_rejected: { label: 'Documentos rechazados', color: 'error', sectionStatus: 'rejected' },
  approved: { label: 'Aprobado', color: 'success', sectionStatus: 'approved' },
  rejected: { label: 'Rechazado', color: 'error', sectionStatus: 'rejected' },
  suspended: { label: 'Suspendido', color: 'warning', sectionStatus: 'rejected' },
  blocked: { label: 'Bloqueado', color: 'error', sectionStatus: 'rejected' },
};

const DOCUMENT_DEFS = [
  { key: 'id_front', name: 'INE — frente', type: 'identity', allowMany: false },
  { key: 'id_back', name: 'INE — reverso', type: 'identity', allowMany: false },
  { key: 'verification_selfie', name: 'Selfie verificación', type: 'identity', allowMany: false },
  { key: 'driver_license_front', name: 'Licencia — frente', type: 'license', allowMany: false },
  { key: 'driver_license_back', name: 'Licencia — reverso', type: 'license', allowMany: false },
  { key: 'proof_of_address', name: 'Comprobante domicilio', type: 'identity', allowMany: true },
  { key: 'vehicle_front_photo', name: 'Foto vehículo — frente', type: 'vehicle', allowMany: true },
  { key: 'vehicle_side_photo', name: 'Foto vehículo — lateral', type: 'vehicle', allowMany: true },
  { key: 'vehicle_back_photo', name: 'Foto vehículo — trasera', type: 'vehicle', allowMany: true },
  { key: 'vehicle_interior_photo', name: 'Foto vehículo — interior', type: 'vehicle', allowMany: true },
  {
    key: 'vehicle_registration_card',
    name: 'Tarjeta de circulación',
    type: 'vehicle',
    allowMany: true,
  },
  {
    key: 'vehicle_insurance_document',
    name: 'Seguro del vehículo',
    type: 'vehicle',
    allowMany: true,
  },
];

const PROCESS_STEP_LABELS = {
  cuenta: 'Cuenta',
  verificacion: 'Verificación',
  personales: 'Datos personales',
  documentos: 'Documentos',
  licencia: 'Licencia',
  vehiculo: 'Vehículo',
  fotos: 'Fotos vehículo',
  cita: 'Cita presencial',
  resumen: 'Resumen',
};

const asString = (value) => String(value ?? '').trim();

const toAbsoluteUrl = (rawUrl) => {
  if (!rawUrl) return null;
  if (String(rawUrl).startsWith('http')) return rawUrl;
  const host = STRAPI_URL.replace(/\/$/, '');
  return `${host}${rawUrl}`;
};

const toMediaArray = (field) => {
  if (field === null || field === undefined) return [];
  const raw = field?.data === undefined ? field : field.data;
  if (!raw) return [];

  const arr = Array.isArray(raw) ? raw : [raw];
  return arr
    .map((entry) => normalizeEntity(entry))
    .filter(Boolean)
    .map((entry) => ({
      id: entry.id,
      name: asString(entry.name),
      mime: asString(entry.mime),
      url: toAbsoluteUrl(entry.url),
      updatedAt: entry.updatedAt || null,
    }))
    .filter((entry) => Boolean(entry.url));
};

const makeInitials = (fullName) => {
  const tokens = asString(fullName).split(' ').filter(Boolean);
  if (!tokens.length) return '—';
  return tokens
    .slice(0, 2)
    .map((token) => token.charAt(0).toUpperCase())
    .join('');
};

const formatDateOrDash = (value) => {
  if (!value) return '—';
  const parsed = dayjs(value);
  if (!parsed.isValid()) return '—';
  return parsed.format('D MMM YYYY');
};

const mapDocumentStatus = (driverStatus, hasFile) => {
  if (!hasFile) return 'pending';
  if (driverStatus === 'approved') return 'approved';
  if (driverStatus === 'documents_rejected' || driverStatus === 'rejected' || driverStatus === 'blocked') {
    return 'rejected';
  }
  if (driverStatus === 'pending_review') return 'needs_review';
  return 'pending';
};

const countFilled = (values = []) => values.filter((value) => asString(value)).length;

const pct = (current, total) => {
  if (!total) return 0;
  return Math.round((current / total) * 100);
};

const mapStatusMeta = (status) => DRIVER_STATUS_META[status] || DRIVER_STATUS_META.draft;

const getDocumentsSectionStatus = ({ rejectedCount, needsReviewCount }) => {
  if (rejectedCount > 0) return 'rejected';
  if (needsReviewCount > 0) return 'needs_review';
  return 'pending';
};

const makeSection = (id, label, icon, status, sub, count) => ({
  id,
  label,
  icon,
  status,
  sub,
  count: count ?? null,
});

export const mapDriverDetailsToViewModel = (driverEntity) => {
  if (!driverEntity) return null;

  const status = asString(driverEntity.status) || 'draft';
  const statusMeta = mapStatusMeta(status);

  const firstName = asString(driverEntity.firstname);
  const middleName = asString(driverEntity.middlename);
  const lastName = asString(driverEntity.lastname);
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ') || 'Conductor sin nombre';

  const agency = normalizeEntity(driverEntity.agency?.data || driverEntity.agency);
  const reviewer = normalizeEntity(driverEntity.reviewer?.data || driverEntity.reviewer);
  const user = normalizeEntity(driverEntity.user?.data || driverEntity.user);

  const documents = DOCUMENT_DEFS.flatMap((def) => {
    const files = toMediaArray(driverEntity[def.key]);
    const hasFile = files.length > 0;
    const docStatus = mapDocumentStatus(status, hasFile);
    const defaultNote = hasFile ? 'Archivo cargado' : 'Sin archivo';

    if (def.allowMany && files.length > 0) {
      return files.map((file, index) => ({
        id: `${def.key}-${file.id || index}`,
        sourceField: def.key,
        type: def.type,
        name: files.length > 1 ? `${def.name} ${index + 1}` : def.name,
        status: docStatus,
        note: file.updatedAt ? `Actualizado: ${formatDateOrDash(file.updatedAt)}` : defaultNote,
        imageUrl: file.url,
        fileUrl: file.url,
        hasFile: true,
      }));
    }

    const firstFile = files[0] || null;
    return [
      {
        id: def.key,
        sourceField: def.key,
        type: def.type,
        name: def.name,
        status: docStatus,
        note: firstFile?.updatedAt ? `Actualizado: ${formatDateOrDash(firstFile.updatedAt)}` : defaultNote,
        imageUrl: firstFile?.url || null,
        fileUrl: firstFile?.url || null,
        hasFile,
      },
    ];
  });

  const uploadedCount = documents.filter((doc) => doc.hasFile).length;
  const totalDocs = documents.length;
  const approvedDocsCount = documents.filter((doc) => doc.status === 'approved').length;
  const needsReviewCount = documents.filter((doc) => doc.status === 'needs_review').length;
  const rejectedCount = documents.filter((doc) => doc.status === 'rejected').length;

  const personalFields = [
    firstName,
    lastName,
    asString(driverEntity.birthdate),
    asString(driverEntity.curp),
    asString(driverEntity.rfc),
  ];
  const contactFields = [
    asString(driverEntity.email),
    asString(driverEntity.phone),
    asString(driverEntity.emergency_phone),
    asString(driverEntity.address),
    asString(driverEntity.zip_code),
  ];
  const vehicleFields = [
    asString(driverEntity.vehicle_brand),
    asString(driverEntity.vehicle_model),
    asString(driverEntity.vehicle_year),
    asString(driverEntity.vehicle_color),
    asString(driverEntity.license_plate),
    asString(driverEntity.vin_number),
  ];

  const identityDocs = documents.filter((doc) => doc.type === 'identity' || doc.type === 'license');
  const vehicleDocs = documents.filter((doc) => doc.type === 'vehicle');

  const score = {
    identity: pct(identityDocs.filter((doc) => doc.hasFile).length, identityDocs.length),
    docs: pct(uploadedCount, totalDocs),
    vehicle: pct(
      countFilled(vehicleFields) + vehicleDocs.filter((doc) => doc.hasFile).length,
      vehicleFields.length + (vehicleDocs.length || 1)
    ),
  };
  score.overall = Math.round((score.identity + score.docs + score.vehicle) / 3);

  const processFlags = {
    profileCompleted: Boolean(driverEntity.profile_completed),
    documentsCompleted: Boolean(driverEntity.documents_completed),
    appointmentScheduled: Boolean(driverEntity.appointment_scheduled),
    inPersonVerificationCompleted: Boolean(driverEntity.in_person_verification_completed),
    finalApproval: Boolean(driverEntity.final_approval),
    currentStep: asString(driverEntity.current_step),
  };

  const sections = [
    makeSection(
      'personal',
      'Información personal',
      'PersonOutline',
      countFilled(personalFields) === personalFields.length ? 'approved' : 'pending',
      `${countFilled(personalFields)}/${personalFields.length} campos`,
      countFilled(personalFields)
    ),
    makeSection(
      'contact',
      'Información contacto',
      'BadgeOutlined',
      countFilled(contactFields) >= 3 ? 'approved' : 'pending',
      `${countFilled(contactFields)}/${contactFields.length} campos`,
      countFilled(contactFields)
    ),
    makeSection(
      'vehicle',
      'Información vehículo',
      'DirectionsCar',
      countFilled(vehicleFields) >= 4 ? 'approved' : 'pending',
      `${countFilled(vehicleFields)}/${vehicleFields.length} campos`,
      countFilled(vehicleFields)
    ),
    makeSection(
      'documents',
      'Documentos',
      'RecentActors',
      getDocumentsSectionStatus({ rejectedCount, needsReviewCount }),
      `${uploadedCount}/${totalDocs} cargados`,
      uploadedCount
    ),
    makeSection(
      'process',
      'Estado del proceso',
      'VerifiedUser',
      statusMeta.sectionStatus,
      processFlags.currentStep
        ? `Paso: ${PROCESS_STEP_LABELS[processFlags.currentStep] || processFlags.currentStep}`
        : statusMeta.label
    ),
    makeSection(
      'agency',
      'Agencia asignada',
      'Business',
      agency?.id ? 'approved' : 'pending',
      agency?.nombre ? asString(agency.nombre) : 'Sin agencia'
    ),
  ];

  const profilePic = toMediaArray(driverEntity.profile_pic)[0] || null;
  const selfie = toMediaArray(driverEntity.verification_selfie)[0] || null;
  const ine = toMediaArray(driverEntity.id_front)[0] || null;

  const events = [
    {
      id: 'driver-created',
      type: 'info',
      text: 'Expediente creado',
      time: formatDateOrDash(driverEntity.createdAt),
    },
    {
      id: 'driver-updated',
      type: 'info',
      text: `Estado actual: ${statusMeta.label}`,
      time: formatDateOrDash(driverEntity.updatedAt),
    },
  ].filter((event) => event.time !== '—');

  return {
    driver: {
      id: String(driverEntity.id || ''),
      name: fullName,
      initials: makeInitials(fullName),
      status,
      statusLabel: statusMeta.label,
      appointmentDate: driverEntity.appointment_date || null,
      branch: agency?.nombre || asString(driverEntity.state) || '—',
      reviewer: reviewer?.username || user?.username || 'Sin asignar',
      assignedAt: driverEntity.updatedAt || driverEntity.createdAt || null,
      docsProgress: { completed: approvedDocsCount, total: totalDocs },
      profileImageUrl: profilePic?.url || null,
      personal: {
        birthdate: driverEntity.birthdate || null,
        curp: asString(driverEntity.curp),
        rfc: asString(driverEntity.rfc),
      },
      contact: {
        email: asString(driverEntity.email),
        phone: asString(driverEntity.phone),
        emergencyPhone: asString(driverEntity.emergency_phone),
        address: asString(driverEntity.address),
        zipCode: asString(driverEntity.zip_code),
        state: asString(driverEntity.state),
        municipality: asString(driverEntity.municipality),
      },
      agency: {
        id: agency?.id || null,
        name: asString(agency?.nombre),
      },
      process: {
        status,
        statusLabel: statusMeta.label,
        ...processFlags,
      },
    },
    vehicle: {
      brand: asString(driverEntity.vehicle_brand),
      model: asString(driverEntity.vehicle_model),
      year: asString(driverEntity.vehicle_year),
      color: asString(driverEntity.vehicle_color),
      plates: asString(driverEntity.license_plate),
      vin: asString(driverEntity.vin_number),
    },
    documents,
    biometric: {
      selfieUrl: selfie?.url || null,
      ineUrl: ine?.url || null,
      similarityScore: null,
    },
    sections,
    score,
    observations: asString(driverEntity.reviewer_notes),
    events,
  };
};

export const mapDriverStatusToChip = (status) => mapStatusMeta(status);

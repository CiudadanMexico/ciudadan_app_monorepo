/**
 * Navegación de la pantalla de revisión de validación (cars_validation + cars_evidences).
 * Fuente única de verdad para secciones, filtros de contenido y métricas del sidebar.
 */

const asString = (value) => String(value ?? '').trim();

const countFilled = (values = []) => values.filter((value) => asString(value)).length;

const pct = (current, total) => {
  if (!total) return 0;
  return Math.round((current / total) * 100);
};

const getDocumentsSectionStatus = ({ rejectedCount, needsReviewCount, uploadedCount, total }) => {
  if (!total) return 'pending';
  if (rejectedCount > 0) return 'rejected';
  if (needsReviewCount > 0) return 'needs_review';
  if (uploadedCount === total) return 'approved';
  return 'pending';
};

const makeSection = ({ id, label, icon, status, sub, count }) => ({
  id,
  label,
  icon,
  status,
  sub,
  count: count ?? null,
});

/** Orden y definición de secciones de revisión (sidebar + panel principal). */
export const REVIEW_NAV_SECTIONS = [
  {
    id: 'personal',
    label: 'Datos personales',
    icon: 'BadgeOutlined',
    content: 'personal',
  },
  {
    id: 'identity',
    label: 'Identidad y documentos',
    icon: 'RecentActors',
    content: 'documents',
    matchDocument: (doc) => doc.type !== 'vehicle',
    progressUnit: 'documentos',
  },
  {
    id: 'vehicle',
    label: 'Vehículo',
    icon: 'DirectionsCar',
    content: 'documents',
    matchDocument: (doc) => doc.type === 'vehicle',
    progressUnit: 'documentos',
  },
  {
    id: 'biometric',
    label: 'Comparación biométrica',
    icon: 'FaceRetouchingNatural',
    content: 'biometric',
    biometricTypes: ['selfie_live', 'id_front'],
    progressUnit: 'documentos',
  },
];

export const DEFAULT_REVIEW_SECTION_ID = REVIEW_NAV_SECTIONS[0].id;

export const getReviewSectionLabel = (sectionId) =>
  REVIEW_NAV_SECTIONS.find((section) => section.id === sectionId)?.label ?? '';

const getPersonalFieldValues = (driver) => {
  if (!driver) return [];
  return [
    driver.name,
    driver.personal?.birthdate,
    driver.personal?.curp,
    driver.personal?.rfc,
    driver.contact?.email,
    driver.contact?.phone,
    driver.contact?.emergencyPhone,
    driver.contact?.address,
    driver.contact?.zipCode,
    driver.contact?.state,
    driver.contact?.municipality,
  ];
};

const getBiometricDocuments = (documents, biometricTypes) =>
  documents.filter((doc) => biometricTypes.includes(doc.evidenceType));

export const getDocumentsForReviewSection = (sectionId, documents = []) => {
  const section = REVIEW_NAV_SECTIONS.find((item) => item.id === sectionId);
  if (!section) return [];

  if (section.content === 'documents' && section.matchDocument) {
    return documents.filter(section.matchDocument);
  }

  if (section.content === 'biometric' && section.biometricTypes) {
    return getBiometricDocuments(documents, section.biometricTypes);
  }

  return [];
};

const buildPersonalSection = (driver) => {
  const fields = getPersonalFieldValues(driver);
  const filled = countFilled(fields);
  const total = fields.length;

  return makeSection({
    id: 'personal',
    label: 'Datos personales',
    icon: 'BadgeOutlined',
    status: (() => {
      if (total > 0 && filled === total) return 'approved';
      if (filled > 0) return 'needs_review';
      return 'pending';
    })(),
    sub: total ? `${filled}/${total} campos` : 'Sin datos',
    count: filled,
  });
};

const buildDocumentSection = (sectionDef, documents) => {
  const sectionDocs = documents.filter(sectionDef.matchDocument);
  const uploadedCount = sectionDocs.filter((doc) => doc.hasFile).length;
  const total = sectionDocs.length;
  const rejectedCount = sectionDocs.filter((doc) => doc.status === 'rejected').length;
  const needsReviewCount = sectionDocs.filter((doc) => doc.status === 'needs_review').length;
  const unit = sectionDef.progressUnit || 'documentos';

  return makeSection({
    id: sectionDef.id,
    label: sectionDef.label,
    icon: sectionDef.icon,
    status: getDocumentsSectionStatus({ rejectedCount, needsReviewCount, uploadedCount, total }),
    sub: total ? `${uploadedCount}/${total} ${unit}` : `0 ${unit}`,
    count: uploadedCount,
  });
};

const buildBiometricSection = (sectionDef, documents) => {
  const sectionDocs = getBiometricDocuments(documents, sectionDef.biometricTypes);
  const uploadedCount = sectionDocs.filter((doc) => doc.hasFile).length;
  const total = sectionDef.biometricTypes.length;
  const unit = sectionDef.progressUnit || 'documentos';

  return makeSection({
    id: sectionDef.id,
    label: sectionDef.label,
    icon: sectionDef.icon,
    status: (() => {
      if (uploadedCount === total) return 'approved';
      if (uploadedCount > 0) return 'needs_review';
      return 'pending';
    })(),
    sub: `${uploadedCount}/${total} ${unit}`,
    count: uploadedCount,
  });
};

/**
 * Construye las secciones del sidebar a partir de evidencias reales y datos del conductor.
 */
export const buildReviewNavigationSections = ({ documents = [], driver = null } = {}) =>
  REVIEW_NAV_SECTIONS.map((sectionDef) => {
    if (sectionDef.id === 'personal') {
      return buildPersonalSection(driver);
    }
    if (sectionDef.content === 'biometric') {
      return buildBiometricSection(sectionDef, documents);
    }
    if (sectionDef.content === 'documents') {
      return buildDocumentSection(sectionDef, documents);
    }
    return makeSection(sectionDef);
  });

/**
 * Métricas por sección para el score operativo del sidebar (derivadas de evidencias).
 */
export const computeReviewSectionScores = (documents = []) => {
  const identityDocs = documents.filter((doc) => doc.type !== 'vehicle');
  const vehicleDocs = documents.filter((doc) => doc.type === 'vehicle');

  const identity = pct(
    identityDocs.filter((doc) => doc.status === 'approved').length,
    identityDocs.length || 1
  );
  const docs = pct(
    documents.filter((doc) => doc.status === 'approved').length,
    documents.length || 1
  );
  const vehicle = pct(
    vehicleDocs.filter((doc) => doc.status === 'approved').length,
    vehicleDocs.length || 1
  );

  return {
    identity,
    docs,
    vehicle,
    overall: Math.round((identity + docs + vehicle) / 3),
  };
};

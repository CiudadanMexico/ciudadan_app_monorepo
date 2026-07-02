/** Mapeo tipo de evidencia (backend) → campo del formulario de preregistro. */
export const EVIDENCE_TYPE_TO_FORM_FIELD = {
  profile_photo: 'foto_perfil',
  selfie_live: 'selfie_verificacion',
  id_front: 'ine_frente',
  id_back: 'ine_reverso',
  license_front: 'licencia_frente',
  license_back: 'licencia_reverso',
  proof_of_address: 'comprobante_domicilio',
  vehicle_front: 'foto_vehiculo_frontal',
  vehicle_left: 'foto_vehiculo_lateral',
  vehicle_right: 'foto_vehiculo_lateral',
  vehicle_back: 'foto_vehiculo_trasera',
  interior: 'foto_interior',
  registration_card: 'tarjeta_circulacion',
  insurance_document: 'seguro_vehiculo',
};

const EVIDENCE_TYPE_TO_WIZARD_STEP = {
  profile_photo: 'documentos',
  selfie_live: 'documentos',
  id_front: 'documentos',
  id_back: 'documentos',
  proof_of_address: 'documentos',
  license_front: 'documentos',
  license_back: 'documentos',
  vehicle_front: 'fotos',
  vehicle_back: 'fotos',
  vehicle_left: 'fotos',
  vehicle_right: 'fotos',
  interior: 'fotos',
  registration_card: 'fotos',
  insurance_document: 'fotos',
};

export const getPendingResubFieldsForStep = (stepId, requiredDocuments = []) => {
  const fields = new Set();
  for (const doc of requiredDocuments) {
    const fieldName = EVIDENCE_TYPE_TO_FORM_FIELD[doc.evidenceType];
    if (!fieldName) continue;
    const docStep = doc.wizardStep || EVIDENCE_TYPE_TO_WIZARD_STEP[doc.evidenceType];
    if (docStep === stepId) fields.add(fieldName);
  }
  return fields;
};

export const getPendingResubStepIds = (requiredDocuments = []) => {
  const stepIds = new Set();
  for (const doc of requiredDocuments) {
    const docStep = doc.wizardStep || EVIDENCE_TYPE_TO_WIZARD_STEP[doc.evidenceType];
    if (docStep) stepIds.add(docStep);
  }
  return stepIds;
};

export const getResubMetaByField = (requiredDocuments = []) => {
  const meta = {};
  for (const doc of requiredDocuments) {
    const fieldName = EVIDENCE_TYPE_TO_FORM_FIELD[doc.evidenceType];
    if (!fieldName) continue;
    meta[fieldName] = {
      label: doc.label,
      status: doc.status,
      reviewerNote: doc.reviewerNote || null,
    };
  }
  return meta;
};

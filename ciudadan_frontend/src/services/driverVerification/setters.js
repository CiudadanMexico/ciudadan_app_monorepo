import { normalizeEntity, parseJsonSafe } from '../../utils/preRegisterForSteps/helpers';

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL || '';

const buildJsonOptions = (method, payload) => ({
  method,
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

export const updateDriverDetails = async (id, payload) => {
  const url = `${STRAPI_URL}/api/drivers/${id}`;
  const res = await fetch(url, buildJsonOptions('PUT', { data: payload }));
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.error?.message || 'No se pudo actualizar los detalles del conductor.');
  }
  return normalizeEntity(data?.data);
};

export const updateEvidenceReview = async (evidenceId, { reviewStatus, reviewerNote, userId }) => {
  const res = await fetch(
    `${STRAPI_URL}/api/cars-evidences/${evidenceId}/review`,
    buildJsonOptions('PATCH', {
      review_status: reviewStatus,
      reviewer_note: reviewerNote || null,
      userId: userId || null,
    })
  );
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.error?.message || 'No se pudo actualizar el documento.');
  }
  return normalizeEntity(data?.data);
};

export const updateValidationObservations = async (validationId, observations, userId) => {
  const res = await fetch(
    `${STRAPI_URL}/api/cars-validations/${validationId}/observations`,
    buildJsonOptions('PATCH', { observations, userId: userId || null })
  );
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.error?.message || 'No se pudieron guardar las observaciones.');
  }
  return normalizeEntity(data?.data);
};

export const completeValidation = async (validationId, { action, observations, userId }) => {
  const res = await fetch(
    `${STRAPI_URL}/api/cars-validations/${validationId}/complete`,
    buildJsonOptions('POST', {
      action,
      observations: observations || null,
      userId: userId || null,
    })
  );
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.error?.message || 'No se pudo completar la validación.');
  }
  return normalizeEntity(data?.data);
};

export const syncValidationFromDriver = async ({ driverId, userId, origin = 'reupload' }) => {
  const res = await fetch(
    `${STRAPI_URL}/api/cars-validations/sync-from-driver`,
    buildJsonOptions('POST', {
      driverId,
      userId: userId || null,
      origin,
    })
  );
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.error?.message || 'No se pudo sincronizar evidencias del conductor.');
  }
  return data?.data || {};
};

import { normalizeEntity, parseJsonSafe } from '../../utils/preRegisterForSteps/helpers';

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL || '';

export const getDriverDetails = async (id) => {
  const url = `${STRAPI_URL}/api/drivers/${id}?populate=*`;
  const res = await fetch(url, { credentials: 'include' });
  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(data?.error?.message || 'No se pudo cargar los detalles del conductor.');
  }

  return normalizeEntity(data?.data);
};

export const getValidationReviewBundle = async (validationId) => {
  const url = `${STRAPI_URL}/api/cars-validations/${validationId}/review-bundle`;
  const res = await fetch(url, { credentials: 'include' });
  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(data?.error?.message || 'No se pudo cargar la validación.');
  }

  return normalizeEntity(data?.data);
};

export const resolveValidationByAgendaId = async (agendaId) => {
  const url = `${STRAPI_URL}/api/cars-validations/resolve?agendaId=${encodeURIComponent(agendaId)}`;
  const res = await fetch(url, { credentials: 'include' });
  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(data?.error?.message || 'No se pudo resolver la validación de esta agenda.');
  }

  const validation = data?.data?.validation || data?.data;
  return normalizeEntity(validation);
};

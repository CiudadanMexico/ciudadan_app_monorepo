import { parseJsonSafe, normalizeEntity } from '../../utils/preRegisterForSteps/helpers';

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL || '';

const buildJsonOptions = (method, payload) => ({
  method,
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

export const getUserByEmail = async (email) => {
  if (!email) return null;
  const url = `${STRAPI_URL}/api/users?filters[email][$eq]=${encodeURIComponent(email)}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) return null;
  const data = await parseJsonSafe(res);
  const first = Array.isArray(data) ? data[0] : Array.isArray(data?.data) ? data.data[0] : null;
  return normalizeEntity(first);
};

export const registerAccount = async ({ email, password, telefono }) => {
  const res = await fetch(
    `${STRAPI_URL}/api/auth/local/register`,
    buildJsonOptions('POST', {
      username: email,
      email,
      password,
      phone: telefono,
    })
  );
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.error?.message || data?.message || 'No se pudo crear la cuenta.');
  }
  return data;
};

export const sendWhatsAppVerificationCode = async (phone) => {
  const res = await fetch(
    `${STRAPI_URL}/api/verification/send-whatsapp`,
    buildJsonOptions('POST', {
      phone,
    })
  );
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(
      data?.error?.message || data?.message || 'No se pudo enviar el codigo por WhatsApp.'
    );
  }
  return data;
};

export const verifyWhatsAppVerificationCode = async (phone, code) => {
  const res = await fetch(
    `${STRAPI_URL}/api/verification/verify-whatsapp`,
    buildJsonOptions('POST', {
      phone,
      code,
    })
  );
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.error?.message || data?.message || 'No se pudo verificar el codigo.');
  }
  return data;
};

export const getDriverDraftByUser = async (userId) => {
  if (!userId) return null;
  const url = `${STRAPI_URL}/api/drivers?filters[user][id][$eq]=${userId}&pagination[pageSize]=1&sort=updatedAt:desc&populate=*`;
  const res = await fetch(url, { credentials: 'include' });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.error?.message || 'No se pudo cargar el preregistro.');
  }
  const row = Array.isArray(data?.data) ? data.data[0] : null;
  return normalizeEntity(row);
};

export const createDriverDraft = async ({ userId, email }) => {
  console.log('createDriverDraft userId', userId);
  const payload = {
    data: {
      user: userId,
      email: email || '',
      current_step: 'bienvenida',
      status: 'draft',
      profile_completed: false,
      documents_completed: false,
      appointment_scheduled: false,
      final_approval: false,
      in_person_verification_completed: false,
    },
  };

  const res = await fetch(`${STRAPI_URL}/api/drivers`, buildJsonOptions('POST', payload));
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.error?.message || 'No se pudo crear el borrador de preregistro.');
  }
  return normalizeEntity(data?.data);
};

export const getOrCreateDriverDraft = async ({ userId, email }) => {
  const current = await getDriverDraftByUser(userId);
  if (current?.id) return current;
  return createDriverDraft({ userId, email });
};

export const updateDriverDraft = async (driverId, payload) => {
  console.log('updateDriverDraft payload', payload);
  const res = await fetch(
    `${STRAPI_URL}/api/drivers/${driverId}?populate=*`,
    buildJsonOptions('PUT', { data: payload })
  );
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.error?.message || 'No se pudo guardar el paso.');
  }
  return normalizeEntity(data?.data);
};

export const fetchAgencies = async () => {
  const res = await fetch(`${STRAPI_URL}/api/agencias?pagination[pageSize]=100&sort=nombre:asc`, {
    credentials: 'include',
  });
  if (!res.ok) return [];
  const data = await parseJsonSafe(res);
  console.log('fetchAgencies data', data);
  return (data?.data || []).map((item) => ({
    id: item.id,
    nombre: item?.attributes?.nombre || item?.attributes?.name || `Sede ${item.id}`,
  }));
};

export const getLatestDriverAgendaByUser = async (userId) => {
  if (!userId) return null;
  const url = `${STRAPI_URL}/api/agendas?filters[usuario][id][$eq]=${userId}&filters[descripcion][$containsi]=Preregistro conductor&sort=fecha_inicio:desc&pagination[pageSize]=1&populate=*`;
  const res = await fetch(url, { credentials: 'include' });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.error?.message || 'No se pudo consultar la agenda del conductor.');
  }
  const row = Array.isArray(data?.data) ? data.data[0] : null;
  return normalizeEntity(row);
};

export const updateStrapiUserProfile = async (userId, payload) => {
  if (!userId) {
    throw new Error('No se pudo actualizar el usuario: id invalido.');
  }
  const res = await fetch(
    `${STRAPI_URL}/api/users/${userId}`,
    buildJsonOptions('PUT', { data: payload })
  );
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.error?.message || data?.message || 'No se pudo actualizar el usuario.');
  }
  return data;
};

export const createDriverAgenda = async (payload) => {
  const res = await fetch(`${STRAPI_URL}/api/agendas`, buildJsonOptions('POST', { data: payload }));
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.error?.message || 'No se pudo crear la cita.');
  }
  return normalizeEntity(data?.data);
};

export const createValidationFromAgenda = async ({
  driverId,
  agendaId,
  agencyId,
  userId,
  appointmentDate,
}) => {
  const res = await fetch(
    `${STRAPI_URL}/api/cars-validations/from-agenda`,
    buildJsonOptions('POST', {
      driverId,
      agendaId,
      agencyId: agencyId || null,
      userId,
      appointmentDate,
    })
  );
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.error?.message || 'No se pudo crear la validación del conductor.');
  }
  return {
    validation: normalizeEntity(data?.data),
    meta: data?.meta || {},
  };
};

export const fetchResubmissionContext = async (driverId) => {
  if (!driverId) return null;
  const url = `${STRAPI_URL}/api/cars-validations/resubmission-context?driverId=${encodeURIComponent(driverId)}`;
  const res = await fetch(url, { credentials: 'include' });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.error?.message || 'No se pudo cargar el contexto de reenvío.');
  }
  return data?.data || null;
};

export const resolveValidationByAgenda = async (agendaId) => {
  if (!agendaId) return null;
  const url = `${STRAPI_URL}/api/cars-validations/resolve?agendaId=${encodeURIComponent(agendaId)}`;
  const res = await fetch(url, { credentials: 'include' });
  const data = await parseJsonSafe(res);
  if (!res.ok) return null;
  return normalizeEntity(data?.data?.validation || data?.data);
};

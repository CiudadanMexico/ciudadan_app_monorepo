import { normalizeEntity, parseJsonSafe } from '../utils/preRegisterForSteps/helpers';

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL || '';
const STRAPI_TOKEN = process.env.REACT_APP_STRAPI_TOKEN || '';

const buildAuthOptions = (method, payload, token = STRAPI_TOKEN) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return {
    method,
    credentials: 'include',
    headers,
    body: payload === undefined ? undefined : JSON.stringify(payload),
  };
};

/**
 * Expediente vehicular del conductor (modelo `vehicle`).
 *
 * Convenciones alineadas con el resto de servicios de taxis:
 *  - Auth0 se valida en backend con `global::is-authenticated-auth0`
 *    (listado) e `global::is-verificador` (tarjeta, abrir/cerrar revisión);
 *  - el estado lo resuelve el servidor (find recorta a usuario/agencia,
 *    lifecycles marcan documento_completo, open/closeReview validan
 *    transiciones).
 */

/** GET /api/vehicles — listado ya recortado al usuario/agencia en el backend. */
export const getMyVehicles = async (token = STRAPI_TOKEN) => {
  const url = `${STRAPI_URL}/api/vehicles?populate=*&pagination[pageSize]=10`;
  const res = await fetch(url, buildAuthOptions('GET', undefined, token));
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.error?.message || 'No se pudo cargar tu expediente vehicular.');
  }
  const list = Array.isArray(data?.data) ? data.data : [];
  return list.map(normalizeEntity);
};

/** GET /api/vehicle/card/:id — solo verificadores (policy is-verificador). */
export const getVehicleCard = async (vehicleId, token = STRAPI_TOKEN) => {
  const url = `${STRAPI_URL}/api/vehicle/card/${encodeURIComponent(vehicleId)}`;
  const res = await fetch(url, buildAuthOptions('GET', undefined, token));
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.error?.message || 'No se pudo leer la tarjeta de circulación.');
  }
  return normalizeEntity(data?.data);
};

/** POST /api/vehicles/:id/open-review — documento_completo → en_revision. */
export const openVehicleReview = async (vehicleId, { observation } = {}, token = STRAPI_TOKEN) => {
  const url = `${STRAPI_URL}/api/vehicles/${encodeURIComponent(vehicleId)}/open-review`;
  const res = await fetch(url, buildAuthOptions('POST', { observation: observation ?? null }, token));
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.error?.message || 'No se pudo abrir la revisión del expediente.');
  }
  return normalizeEntity(data?.data);
};

/**
 * POST /api/vehicles/:id/close-review — en_revision → aprobado | suspenso.
 * Guarda validated_by / validated_at en backend.
 */
export const closeVehicleReview = async (vehicleId, { outcome, observation } = {}, token = STRAPI_TOKEN) => {
  const url = `${STRAPI_URL}/api/vehicles/${encodeURIComponent(vehicleId)}/close-review`;
  const res = await fetch(
    url,
    buildAuthOptions('POST', { outcome, observation: observation ?? null }, token),
  );
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.error?.message || 'No se pudo cerrar la revisión del expediente.');
  }
  return normalizeEntity(data?.data);
};

/**
 * Gate de elegibilidad para aceptar viajes (frontend).
 *
 * Regla: driver.status === 'approved' (persona, enum legacy en inglés)
 *     && vehicle.status === 'aprobado' (unidad, enum nuevo en español).
 *
 * El vehicle puede venir ya populado en el driver (driver.vehicle) o se
 * resuelve con GET /api/vehicles (recortado al usuario en backend).
 * Devuelve { eligible, driverStatus, vehicleStatus, reason } para mostrar
 * el aviso correcto sin emitir la oferta.
 */
export const resolveTripEligibility = async ({ driver, token = STRAPI_TOKEN } = {}) => {
  const d = driver?.attributes ? { id: driver.id, ...driver.attributes } : driver || {};
  const driverStatus = d.status || null;

  let vehicle = d.vehicle?.data !== undefined
    ? (Array.isArray(d.vehicle?.data) ? d.vehicle.data[0] : d.vehicle?.data)
    : d.vehicle || null;
  if (vehicle?.attributes) vehicle = { id: vehicle.id, ...vehicle.attributes };

  if (!vehicle?.status) {
    try {
      const list = await getMyVehicles(token);
      vehicle = list[0] || null;
    } catch {
      vehicle = null;
    }
  }

  const vehicleStatus = vehicle?.status || null;
  const driverOk = driverStatus === 'approved';
  const vehicleOk = vehicleStatus === 'aprobado';

  let reason = null;
  if (!driverOk && !vehicleOk) {
    reason = 'Tu cuenta y tu unidad aún están en revisión. Completa tu expediente para recibir viajes.';
  } else if (!driverOk) {
    reason = `Tu cuenta de conductor está en estado "${driverStatus || 'sin estado'}". Espera la aprobación para recibir viajes.`;
  } else if (!vehicleOk) {
    reason = `Tu unidad está en estado "${vehicleStatus || 'sin expediente'}". Sube tu tarjeta de circulación en Mi expediente.`;
  }

  return { eligible: driverOk && vehicleOk, driverStatus, vehicleStatus, reason };
};


import { parseJsonSafe } from '../../utils/preRegisterForSteps/helpers';
import { computeSha256Hex } from './captureService';

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL || '';

// docs/TAXIS-VERIFICACION-CONDUCTORES-FASES.md, Fase 8: batería de pruebas
// obligatoria incluye "red lenta" — sin timeout, una red lenta deja al
// verificador viendo "Subiendo..." indefinidamente sin saber si se congeló.
const DEFAULT_TIMEOUT_MS = 30000;
const UPLOAD_TIMEOUT_MS = 60000; // los videos pesan más que una foto

const buildAuthHeaders = (token) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const fetchWithTimeout = async (url, options, timeoutMs, timeoutMessage) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(
        timeoutMessage || 'La conexión está tardando demasiado. Revisa tu red e inténtalo de nuevo.'
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Emite un nonce de un solo uso para un paso del protocolo (Fase 1).
 * Protegido por la policy `is-verificador` (Fase 8) — requiere `token`.
 */
export const issueEvidenceChallenge = async (validationId, { step, sessionId, token }) => {
  const res = await fetchWithTimeout(
    `${STRAPI_URL}/api/cars-validations/${validationId}/challenges`,
    {
      method: 'POST',
      credentials: 'include',
      headers: buildAuthHeaders(token),
      body: JSON.stringify({ step, sessionId }),
    },
    DEFAULT_TIMEOUT_MS,
    'No se pudo iniciar la captura: la conexión está muy lenta. Inténtalo de nuevo.'
  );
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.error?.message || 'No se pudo iniciar la captura de este paso.');
  }
  return data?.data;
};

const uploadFileToMediaLibrary = async (blob, filename) => {
  const formData = new FormData();
  formData.append('files', blob, filename);
  const res = await fetchWithTimeout(
    `${STRAPI_URL}/api/upload`,
    { method: 'POST', credentials: 'include', body: formData },
    UPLOAD_TIMEOUT_MS,
    'La subida del archivo está tardando demasiado. Revisa tu conexión e inténtalo de nuevo.'
  );
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.error?.message || 'No se pudo subir el archivo capturado.');
  }
  const uploaded = Array.isArray(data) ? data[0] : data?.[0];
  if (!uploaded?.id) {
    throw new Error('La subida del archivo no devolvió un id válido.');
  }
  return uploaded;
};

/**
 * Consulta qué pasos (`cars-evidence.type`) ya tienen evidencia vigente para
 * esta validación — permite retomar el wizard en el paso correcto si la app
 * se cerró/reabrió a la mitad del protocolo, en vez de reiniciar siempre
 * desde el paso 1 (Fase 8: "cierre/reapertura de sesión").
 */
export const getCompletedStepTypes = async (validationId, token) => {
  const query = new URLSearchParams({
    'filters[validation][id][$eq]': validationId,
    'filters[is_current][$eq]': 'true',
    'fields[0]': 'type',
    'pagination[pageSize]': '100',
  });
  const res = await fetchWithTimeout(
    `${STRAPI_URL}/api/cars-evidences?${query.toString()}`,
    { credentials: 'include', headers: buildAuthHeaders(token) },
    DEFAULT_TIMEOUT_MS
  );
  if (!res.ok) return new Set();
  const data = await parseJsonSafe(res);
  const rows = Array.isArray(data?.data) ? data.data : [];
  return new Set(rows.map((row) => row.type || row.attributes?.type).filter(Boolean));
};

/**
 * Orquesta un paso completo del protocolo de captura en vivo (Fase 2):
 * 1) emite el challenge (nonce) para el `type`/step,
 * 2) sube el blob capturado a la librería de medios,
 * 3) calcula el hash en cliente y registra la evidencia contra el backend,
 *    que recalcula su propio hash y valida el nonce (Fase 1).
 *
 * `idempotencyKey` debe generarse una sola vez por intento de captura (no en
 * cada reintento de red) para que un reintento tras una caída no duplique la
 * evidencia del lado del servidor.
 */
export const captureAndUploadEvidence = async ({
  validationId,
  type,
  blob,
  filename,
  gps,
  sessionId,
  idempotencyKey,
  deviceId,
  appVersion,
  token,
}) => {
  if (!validationId) throw new Error('validationId es requerido.');
  if (!type) throw new Error('type es requerido.');
  if (!blob) throw new Error('No hay archivo capturado para subir.');

  const [challenge, clientSha256, uploadedFile] = await Promise.all([
    issueEvidenceChallenge(validationId, { step: type, sessionId, token }),
    computeSha256Hex(blob),
    uploadFileToMediaLibrary(blob, filename || `${type}-${Date.now()}.jpg`),
  ]);

  const res = await fetchWithTimeout(
    `${STRAPI_URL}/api/cars-validations/${validationId}/evidences`,
    {
      method: 'POST',
      credentials: 'include',
      headers: buildAuthHeaders(token),
      body: JSON.stringify({
        type,
        fileId: uploadedFile.id,
        clientSha256,
        nonceId: challenge.nonce_id,
        sessionId: challenge.session_id,
        gpsLat: gps?.latitude ?? null,
        gpsLng: gps?.longitude ?? null,
        gpsAccuracy: gps?.accuracy_m ?? null,
        clientTimestamp: gps?.client_timestamp || new Date().toISOString(),
        locationSource: gps?.location_source || null,
        deviceId: deviceId || null,
        appVersion: appVersion || null,
        idempotencyKey,
      }),
    },
    UPLOAD_TIMEOUT_MS,
    'El registro de la evidencia está tardando demasiado. Revisa tu conexión e inténtalo de nuevo.'
  );
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(data?.error?.message || 'No se pudo registrar la evidencia capturada.');
  }
  return data?.data;
};

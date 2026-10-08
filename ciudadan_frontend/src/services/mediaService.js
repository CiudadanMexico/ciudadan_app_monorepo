/**
 * mediaService (Bloque 5B): cliente frontend MINIMO del modulo media.
 * SOLO los metodos necesarios para la UI (uploads, jobs, artifacts,
 * download). El navegador NUNCA toca la Media API directamente — todo pasa
 * por el backend (/api/media/...). Sin URL/token de la Media API aqui.
 */
const API_URL = process.env.REACT_APP_STRAPI_URL;

const getHeaders = (token, extra) => ({
  ...(extra || {}),
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

async function handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data && data.error ? data.error : {};
    const e = new Error(err.message || "Error del servicio multimedia");
    e.code = err.code;
    e.status = res.status;
    throw e;
  }
  return data;
}

/** Lista capabilities filtradas (type, resourceClass, commercialStatus...). */
export async function getMediaCapabilities(token) {
  const res = await fetch(`${API_URL}/api/media/capabilities`, {
    headers: getHeaders(token),
  });
  return handle(res);
}

/** Sube un archivo (audio/video/imagen). Devuelve { id, kind, name, ... }. */
export async function uploadMediaFile(token, file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/api/media/uploads`, {
    method: "POST",
    headers: getHeaders(token),
    body: form,
  });
  return handle(res);
}

/** Crea un job. Devuelve { id, status, type, resourceClass, warnings }. */
export async function createMediaJob(token, { type, params, usageContext, priority }) {
  const res = await fetch(`${API_URL}/api/media/jobs`, {
    method: "POST",
    headers: getHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ type, params, usageContext, priority }),
  });
  return handle(res);
}

/** Lista los jobs DEL usuario (status/type/limit/offset). */
export async function listMediaJobs(token, { status, type, limit, offset } = {}) {
  const q = new URLSearchParams();
  if (status) q.set("status", status);
  if (type) q.set("type", type);
  if (limit) q.set("limit", String(limit));
  if (offset) q.set("offset", String(offset));
  const qs = q.toString();
  const res = await fetch(`${API_URL}/api/media/jobs${qs ? "?" + qs : ""}`, {
    headers: getHeaders(token),
  });
  return handle(res);
}

/** Detalle de un job (con sync del estado desde la Media API). */
export async function getMediaJob(token, id) {
  const res = await fetch(`${API_URL}/api/media/jobs/${id}`, {
    headers: getHeaders(token),
  });
  return handle(res);
}

/** Cancela un job propio (queued/running). */
export async function cancelMediaJob(token, id) {
  const res = await fetch(`${API_URL}/api/media/jobs/${id}/cancel`, {
    method: "POST",
    headers: getHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({}),
  });
  return handle(res);
}

/** Reintenta un job terminal (failed/cancelled/interrupted). */
export async function retryMediaJob(token, id) {
  const res = await fetch(`${API_URL}/api/media/jobs/${id}/retry`, {
    method: "POST",
    headers: getHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({}),
  });
  return handle(res);
}

/** Metadatos de artifacts de un job (sin rutas internas). */
export async function getMediaArtifacts(token, id) {
  const res = await fetch(`${API_URL}/api/media/jobs/${id}/artifacts`, {
    headers: getHeaders(token),
  });
  return handle(res);
}

/** URL de descarga (Range/206 lo maneja el backend) — para <audio>/<video>. */
export function getMediaArtifactDownloadUrl(id, artifactId) {
  return `${API_URL}/api/media/jobs/${id}/artifacts/${artifactId}/download`;
}

"use strict";

/**
 * media-service (Bloque 5B): logica de negocio del modulo media.
 * - ownership CRITICO: un usuario solo accede a SUS jobs/uploads
 *   (verificacion LOCAL antes de cualquier llamada remota).
 * - NO duplica la DB remota: guarda ownership + media_job_id + metadata UI.
 * - usage_context: default internal; clasificacion server-side.
 * - priority: server-side (normal=50; admin/socio hasta 100).
 * - quotas ligeras: max light/heavy activos por usuario + uploads/dia.
 * - heavy limit: 429 MEDIA_HEAVY_LIMIT si ya tiene heavy activo (no admin).
 * - rate limit simple en memoria (sin Redis).
 */

const apiClient = require("./media-api-client");
const crypto = require("crypto");

const JOB_TYPES = ["transcribe", "av_sync", "faceswap", "lipsync",
  "music_generate", "music_repaint", "music_add_track", "music_complete",
  "stem_extract", "stems"];

// Paso 37: params allowlist por type (NO passthrough arbitrario).
// uploadId/videoUpload/audioUpload son IDs de MediaUpload LOCALES que el
// servicio resuelve a rutas internas de la Media API (nunca expuestas).
const PARAM_ALLOWLIST = {
  transcribe: ["uploadId", "language", "provider", "noFallback"],
  av_sync: ["videoUpload", "audioUpload", "mode", "offsetMs",
    "durationPolicy", "allowGenerative", "language", "provider"],
  faceswap: ["sourceUpload", "targetUpload", "selector", "order", "threads"],
  lipsync: ["videoUpload", "audioUpload", "faceIndex", "bboxShift",
    "threads", "timeout"],
  music_generate: ["prompt", "lyrics", "duration", "language", "seed",
    "model"],
  music_repaint: ["uploadId", "start", "end", "prompt", "seed"],
  music_add_track: ["uploadId", "track", "prompt", "seed"],
  music_complete: ["uploadId", "track", "prompt", "seed"],
  stem_extract: ["uploadId", "track", "engine"],
  stems: ["uploadId", "tracks", "engine"],
};

const UPLOAD_KINDS = ["audio", "video", "image"];
const KIND_EXT = {
  audio: [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".opus", ".wma"],
  video: [".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v"],
  image: [".jpg", ".jpeg", ".png", ".webp", ".gif"],
};

// Paso 19: limite de upload por usuario (default 500 MiB, configurable).
function userMaxUploadBytes() {
  const v = parseInt(process.env.MEDIA_USER_MAX_UPLOAD_BYTES || "", 10);
  return Number.isFinite(v) && v > 0 ? v : 524288000;
}
// Paso 45: quotas iniciales (configurables).
function maxActiveLight() { const v = parseInt(process.env.MEDIA_MAX_ACTIVE_LIGHT || "", 10); return Number.isFinite(v) && v > 0 ? v : 3; }
function maxActiveHeavy() { const v = parseInt(process.env.MEDIA_MAX_ACTIVE_HEAVY || "", 10); return Number.isFinite(v) && v > 0 ? v : 1; }
function maxUploadsPerDay() { const v = parseInt(process.env.MEDIA_MAX_UPLOADS_PER_DAY || "", 10); return Number.isFinite(v) && v > 0 ? v : 20; }
function maxJobsPerDay() { const v = parseInt(process.env.MEDIA_MAX_JOBS_PER_DAY || "", 10); return Number.isFinite(v) && v > 0 ? v : 50; }

// Paso 47: rate limit simple en memoria por usuario (sin Redis).
const rateBuckets = new Map(); // userId -> {count, windowStart}
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_REQ = parseInt(process.env.MEDIA_RATE_LIMIT_PER_MIN || "", 10) || 60;

function rateLimit(user) {
  const now = Date.now();
  const key = String(user && user.id);
  const b = rateBuckets.get(key);
  if (!b || now - b.windowStart > RATE_WINDOW_MS) {
    rateBuckets.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (b.count >= RATE_MAX_REQ) return false;
  b.count += 1;
  return true;
}

function isAdmin(user) {
  if (!user) return false;
  const roleName = (user.role && (user.role.name || user.role.type)) || "";
  const rolesArr = Array.isArray(user.roles) ? user.roles.map((r) => r.name || r) : [];
  return /admin/i.test(roleName) || rolesArr.some((r) => /admin/i.test(r));
}

function isSocio(user) {
  if (!user) return false;
  const roleName = (user.role && (user.role.name || user.role.type)) || "";
  const rolesArr = Array.isArray(user.roles) ? user.roles.map((r) => r.name || r) : [];
  return /socio/i.test(roleName) || rolesArr.some((r) => /socio/i.test(r)) ||
    user.membresia_vigente === true || user.verificado === true;
}

// ---------- errores seguros (Paso 50) ----------
class MediaError extends Error {
  constructor(status, code, message, extra) {
    super(message || code);
    this.status = status;
    this.code = code;
    this.extra = extra || {};
  }
}

function mapRemoteError(status, data) {
  const remoteCode = data && data.error && data.error.code;
  if (status === 401 || status === 403) {
    return new MediaError(502, "MEDIA_BACKEND_AUTH_ERROR",
      "La Media API rechazo la credencial del backend");
  }
  if (status === 404) return new MediaError(404, "MEDIA_NOT_FOUND", "No encontrado");
  if (status === 409) {
    return new MediaError(409, "MEDIA_POLICY_CONFLICT",
      (data && data.error && data.error.message) ||
      "Restriccion de politica comercial", { remoteCode });
  }
  if (status === 422 || status === 400) {
    return new MediaError(422, "MEDIA_INVALID_REQUEST",
      (data && data.error && data.error.message) || "Request invalida");
  }
  if (status === 429) return new MediaError(429, "MEDIA_LIMIT", "Limite alcanzado");
  if (status >= 500) return new MediaError(502, "MEDIA_SERVICE_ERROR",
    "Error del servicio multimedia");
  return new MediaError(502, "MEDIA_SERVICE_ERROR", "Error del servicio multimedia");
}

function mapClientError(err) {
  if (err instanceof MediaError) return err;
  if (err.isConnDown || err.code === "ECONNREFUSED" || err.code === "EHOSTUNREACH") {
    return new MediaError(503, "MEDIA_SERVICE_UNAVAILABLE",
      "El servicio multimedia no esta disponible");
  }
  if (err.isTimeout || err.code === "ECONNABORTED") {
    return new MediaError(504, "MEDIA_SERVICE_TIMEOUT",
      "El servicio multimedia no respondio a tiempo");
  }
  return new MediaError(502, "MEDIA_SERVICE_ERROR", "Error del servicio multimedia");
}

// ---------- ownership (Paso 14) ----------
async function findOwnedJob(user, localId, { strapi }) {
  let job;
  try {
    job = await strapi.db.query("api::media.media-job").findOne({
      where: { id: localId },
      populate: ["user", "parentJob"],
    });
  } catch (e) {
    throw new MediaError(400, "MEDIA_INVALID_REQUEST", "id de job invalido");
  }
  if (!job) throw new MediaError(404, "MEDIA_NOT_FOUND", "Job no encontrado");
  const owned = job.user && (job.user === user.id || job.user.id === user.id);
  if (!owned && !isAdmin(user)) {
    // 404 (no 403): no revelar existencia de jobs ajenos
    throw new MediaError(404, "MEDIA_NOT_FOUND", "Job no encontrado");
  }
  return job;
}

async function findOwnedUpload(user, uploadId, { strapi }) {
  let up;
  try {
    up = await strapi.db.query("api::media.media-upload").findOne({
      where: { uploadId: String(uploadId || "") },
      populate: ["user"],
    });
  } catch (e) {
    throw new MediaError(400, "MEDIA_INVALID_REQUEST", "uploadId invalido");
  }
  if (!up) throw new MediaError(404, "MEDIA_NOT_FOUND", "Upload no encontrado");
  const owned = up.user && (up.user === user.id || up.user.id === user.id);
  if (!owned && !isAdmin(user)) {
    throw new MediaError(404, "MEDIA_NOT_FOUND", "Upload no encontrado");
  }
  return up;
}

// ---------- quotas ----------
async function assertQuotas(user, resourceClass, { strapi }) {
  const active = await strapi.db.query("api::media.media-job").count({
    where: { user: user.id, status: { $in: ["queued", "running"] } },
  });
  if (!isAdmin(user)) {
    if (resourceClass === "heavy") {
      const activeHeavy = await strapi.db.query("api::media.media-job").count({
        where: { user: user.id, status: { $in: ["queued", "running"] }, resourceClass: "heavy" },
      });
      if (activeHeavy >= maxActiveHeavy()) {
        throw new MediaError(429, "MEDIA_HEAVY_LIMIT",
          "Ya tienes un trabajo pesado en curso; espera o cancela antes de crear otro");
      }
    } else if (active >= maxActiveLight() + maxActiveHeavy()) {
      throw new MediaError(429, "MEDIA_LIMIT", "Demasiados trabajos activos");
    }
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const jobsToday = await strapi.db.query("api::media.media-job").count({
      where: { user: user.id, createdAt: { $gte: since } },
    });
    if (jobsToday >= maxJobsPerDay()) {
      throw new MediaError(429, "MEDIA_LIMIT", "Limite diario de trabajos alcanzado");
    }
    const uploadsToday = await strapi.db.query("api::media.media-upload").count({
      where: { user: user.id, createdAt: { $gte: since } },
    });
    if (uploadsToday >= maxUploadsPerDay()) {
      throw new MediaError(429, "MEDIA_LIMIT", "Limite diario de uploads alcanzado");
    }
  }
}

// La Media API usa snake_case; el modulo acepta camelCase (frontend) y
// convierte server-side.
function toSnake(k) {
  return String(k).replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
}

// ---------- params -> Media API params ----------
async function buildRemoteParams(user, type, params, { strapi }) {
  const allowed = PARAM_ALLOWLIST[type];
  const unknown = Object.keys(params).filter((k) => !allowed.includes(k));
  if (unknown.length) {
    throw new MediaError(422, "MEDIA_INVALID_REQUEST",
      "Parametros no permitidos: " + unknown.join(","));
  }
  const remote = {};
  const uploadKeys = { uploadId: "input", videoUpload: "video", audioUpload: "audio", sourceUpload: "source", targetUpload: "target" };
  for (const [k, v] of Object.entries(params)) {
    if (uploadKeys[k]) {
      const up = await findOwnedUpload(user, v, { strapi });
      // ruta interna del workspace de la Media API: NUNCA se expone al cliente
      remote[uploadKeys[k]] = up.storedPath;
    } else {
      remote[toSnake(k)] = v;
    }
  }
  return remote;
}

module.exports = {
  JOB_TYPES, PARAM_ALLOWLIST, UPLOAD_KINDS, KIND_EXT,
  userMaxUploadBytes, maxActiveLight, maxActiveHeavy, maxUploadsPerDay,
  maxJobsPerDay, rateLimit, RATE_MAX_REQ,
  isAdmin, isSocio,
  MediaError, mapRemoteError, mapClientError,
  findOwnedJob, findOwnedUpload, assertQuotas, buildRemoteParams,
  apiClient,
};

"use strict";

/**
 * Acciones del modulo media (Bloque 5B). Cada accion devuelve un objeto
 * plano (el controller lo asigna a ctx.body) o hace streaming directo.
 * Reglas: ownership local SIEMPRE antes de tocar la Media API; usage/priority
 * server-side; quotas; sin polling bloqueante; sin policy override.
 */

const fs = require("fs");
const path = require("path");
const { PassThrough } = require("stream");
const { strapi } = global;
const core = require("./media-service");
const { mediaRoom } = require("../../../sockets/media-socket");
const { socketPayload } = require("./media-sync-poller");

// Socket.IO events desde REST (Paso 14/15/16): emitir inmediatamente al
// room del propietario (sin esperar el poller). Socket.IO nunca escribe
// estado en MediaJob.
function emitEvent(job, event, userId) {
  const io = global.strapi && global.strapi.io;
  const uid = userId || (job && job.user && (job.user.id || job.user));
  if (!io || !job || !uid) return;
  const payload = socketPayload(job);
  io.to(mediaRoom(uid)).emit(event, payload);
}

function mediaErr(status, code, message) {
  return new core.MediaError(status, code, message);
}

function svc() {
  return core; // media-service (helpers + apiClient)
}

const SAFE_EXT_RE = /^[A-Za-z0-9._-]+$/;

function sanitizeFilename(name) {
  let n = path.basename(String(name || "archivo"));
  if (!SAFE_EXT_RE.test(n)) n = "archivo.bin";
  return n.slice(0, 120);
}

// ---------- GET /api/media/capabilities ----------
async function capabilities(ctx) {
  const user = ctx.state.strapiUser;
  if (!svc().rateLimit(user)) {
    throw mediaErr(429, "MEDIA_LIMIT", "Demasiadas requests");
  }
  const res = await svc().apiClient.getCapabilities().catch((e) => { throw svc().mapClientError(e); });
  if (res.status !== 200) throw svc().mapRemoteError(res.status, res.data);
  const caps = res.data && res.data.capabilities ? res.data.capabilities : {};
  // filtrada: SOLO type/available/resourceClass/commercialStatus/warning
  const out = {};
  for (const [k, v] of Object.entries(caps)) {
    out[k] = {
      available: !!v.available,
      resourceClass: v.resource_class,
      commercialStatus: v.commercial_status,
      warning: v.warning || "",
    };
  }
  return { capabilities: out };
}

// ---------- POST /api/media/uploads ----------
async function upload(ctx) {
  const user = ctx.state.strapiUser;
  if (!svc().rateLimit(user)) {
    throw mediaErr(429, "MEDIA_LIMIT", "Demasiadas requests");
  }
  const files = ctx.request.files || {};
  const f = files.file || (Array.isArray(files.file) ? files.file[0] : null);
  if (!f) {
    throw mediaErr(422, "MEDIA_INVALID_REQUEST", "Falta el archivo (field=file)");
  }
  const size = f.size || 0;
  if (size > svc().userMaxUploadBytes()) {
    throw mediaErr(413, "MEDIA_LIMIT", "Archivo demasiado grande (max " + Math.round(svc().userMaxUploadBytes() / (1024 * 1024)) + " MiB)");
  }
  const name = sanitizeFilename(f.name || f.originalFilename);
  const ext = path.extname(name).toLowerCase();
  const kinds = svc().UPLOAD_KINDS;
  const kind = kinds.find((k) => svc().KIND_EXT[k].includes(ext));
  if (!kind) {
    throw mediaErr(422, "MEDIA_INVALID_REQUEST", "Formato no permitido (audio/video/imagen)");
  }
  const filepath = f.path || f.filepath;
  if (!filepath || !fs.existsSync(filepath)) {
    throw mediaErr(422, "MEDIA_INVALID_REQUEST", "Archivo temporal no disponible");
  }
  // quota de uploads/dia
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const uploadsToday = await strapi.db.query("api::media.media-upload").count({
    where: { user: user.id, createdAt: { $gte: since } },
  });
  if (uploadsToday >= svc().maxUploadsPerDay() && !svc().isAdmin(user)) {
    throw mediaErr(429, "MEDIA_LIMIT", "Limite diario de uploads alcanzado");
  }
  // STREAM a la Media API (sin 2GB en RAM)
  const res = await svc().apiClient.uploadStream(filepath, name, size, undefined)
    .catch((e) => { throw svc().mapClientError(e); });
  if (res.status !== 200) throw svc().mapRemoteError(res.status, res.data);
  const data = res.data || {};
  // referencia local segura (ownership)
  const row = await strapi.db.query("api::media.media-upload").create({
    data: {
      user: user.id,
      uploadId: data.id,
      storedPath: data.stored || null,
      originalName: name,
      mimeType: data.mime_type || f.type || null,
      sizeBytes: data.size_bytes || size,
      sha256: data.sha256 || null,
      kind,
      publishedAt: new Date(),
    },
  });
  return {
    id: row.uploadId,
    kind,
    name: row.originalName,
    sizeBytes: row.sizeBytes,
    sha256: row.sha256,
  };
}

// ---------- POST /api/media/jobs ----------
async function create(ctx) {
  const user = ctx.state.strapiUser;
  if (!svc().rateLimit(user)) {
    throw mediaErr(429, "MEDIA_LIMIT", "Demasiadas requests");
  }
  const body = ctx.request.body || {};
  const type = body.type;
  if (!svc().JOB_TYPES.includes(type)) {
    throw mediaErr(422, "MEDIA_INVALID_REQUEST", "type invalido");
  }
  const params = body.params && typeof body.params === "object" ? body.params : {};
  // usage_context server-side: default internal; el cliente puede pedir
  // commercial (p.ej. trabajo Publia pagado); la Media API aplica la policy.
  const usageContext = body.usageContext === "commercial" ? "commercial" : "internal";
  // priority server-side: normal SIEMPRE 50; admin/socio puede pasar 0-100.
  let priority = 50;
  if (body.priority !== undefined && (svc().isAdmin(user) || svc().isSocio(user))) {
    const p = parseInt(body.priority, 10);
    if (Number.isFinite(p) && p >= 0 && p <= 100) priority = p;
  }
  // params -> remote (resuelve uploadId a rutas internas; valida ownership)
  const remoteParams = await svc().buildRemoteParams(user, type, params, { strapi })
    .catch((e) => { throw e instanceof svc().MediaError ? e : svc().mapClientError(e); });
  // quotas + heavy limit (429)
  const resourceClass = type === "transcribe" || (type === "av_sync" && !remoteParams.allowGenerative && remoteParams.mode !== "generate") ? "light" : "heavy";
  await svc().assertQuotas(user, resourceClass, { strapi })
    .catch((e) => { throw e instanceof svc().MediaError ? e : svc().mapClientError(e); });
  // Idempotency-Key por intento logico (Paso 36)
  const idem = crypto.randomUUID();
  const res = await svc().apiClient.createJob(type, remoteParams, usageContext, priority, idem)
    .catch((e) => { throw svc().mapClientError(e); });
  if (res.status !== 200) throw svc().mapRemoteError(res.status, res.data);
  const remote = res.data || {};
  // MediaJob local (ownership) — paramsSafeJson SIN rutas internas
  const safeParams = {};
  for (const [k, v] of Object.entries(params)) {
    if (/Upload$/.test(k) || k === "uploadId") {
      safeParams[k] = String(v); // solo el uploadId (no rutas)
    } else {
      safeParams[k] = v;
    }
  }
  const row = await strapi.db.query("api::media.media-job").create({
    data: {
      user: user.id,
      mediaJobId: remote.id,
      type,
      status: remote.status || "queued",
      resourceClass: remote.resource_class || resourceClass,
      usageContext,
      priority,
      paramsSafeJson: JSON.stringify(safeParams),
      warnings: remote.warnings || [],
      publishedAt: new Date(),
    },
  });
  // Paso 24: ID local publico; media_job_id NO se expone
  emitEvent(row, "media:job:created", user.id);
  return {
    id: String(row.id),
    status: row.status,
    type: row.type,
    resourceClass: row.resourceClass,
    warnings: row.warnings || [],
  };
}

// ---------- sync on get ----------
function estimateSeconds(job) {
  if (!job || !job.type) return null;
  if (job.type === "lipsync") return "aprox 30 min por minuto de video";
  if (job.resourceClass === "heavy") return "minutos (job pesado)";
  return "segundos";
}

async function syncJob(job) {
  if (!job.mediaJobId) return job;
  const res = await svc().apiClient.getJob(job.mediaJobId).catch(() => null);
  if (!res || res.status !== 200) return job; // Media API down: estado local
  const r = res.data || {};
  const patch = {};
  if (r.status && r.status !== job.status) patch.status = r.status;
  if (r.started_at && !job.startedAt) patch.startedAt = new Date(r.started_at);
  if (r.finished_at && !job.finishedAt) patch.finishedAt = new Date(r.finished_at);
  if (r.error_code) patch.errorCode = r.error_code;
  if (r.error_message) patch.errorMessage = r.error_message;
  if (r.warnings && r.warnings.length) patch.warnings = r.warnings;
  let updated = job;
  if (Object.keys(patch).length) {
    updated = await strapi.db.query("api::media.media-job").update({ where: { id: job.id }, data: patch });
  }
  // cost metadata opcional (Paso 48)
  if (r.started_at && r.finished_at) {
    const secs = (new Date(r.finished_at) - new Date(r.started_at)) / 1000;
    if (Number.isFinite(secs) && secs > 0 && !updated.processingSeconds) {
      updated = await strapi.db.query("api::media.media-job").update({
        where: { id: job.id }, data: { processingSeconds: Math.round(secs * 10) / 10 },
      });
    }
  }
  return updated;
}

function jobView(job) {
  return {
    id: String(job.id),
    status: job.status,
    type: job.type,
    resourceClass: job.resourceClass,
    usageContext: job.usageContext,
    priority: job.priority,
    params: job.paramsSafeJson ? JSON.parse(job.paramsSafeJson) : {},
    warnings: job.warnings || [],
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    error: job.errorCode ? { code: job.errorCode, message: job.errorMessage } : null,
    processingSeconds: job.processingSeconds || null,
    parentJob: job.parentJob ? String(job.parentJob.id || job.parentJob) : null,
    estimatedTime: estimateSeconds(job),
  };
}

// ---------- GET /api/media/jobs/:id ----------
async function get(ctx) {
  const user = ctx.state.strapiUser;
  if (!svc().rateLimit(user)) {
    throw mediaErr(429, "MEDIA_LIMIT", "Demasiadas requests");
  }
  const job = await svc().findOwnedJob(user, ctx.params.id, { strapi });
  const synced = await syncJob(job);
  return { job: jobView(synced) };
}

// ---------- GET /api/media/jobs ----------
async function list(ctx) {
  const user = ctx.state.strapiUser;
  if (!svc().rateLimit(user)) {
    throw mediaErr(429, "MEDIA_LIMIT", "Demasiadas requests");
  }
  const q = ctx.query || {};
  const where = { user: user.id };
  if (q.status) where.status = String(q.status);
  if (q.type) where.type = String(q.type);
  const limit = Math.min(Math.max(parseInt(q.limit || "", 10) || 20, 1), 100);
  const offset = Math.max(parseInt(q.offset || "", 10) || 0, 0);
  const rows = await strapi.db.query("api::media.media-job").findMany({
    where, orderBy: { createdAt: "desc" }, limit, offset,
  });
  const count = await strapi.db.query("api::media.media-job").count({ where });
  return { jobs: rows.map(jobView), count, limit, offset };
}

// ---------- POST /api/media/jobs/:id/cancel ----------
async function cancel(ctx) {
  const user = ctx.state.strapiUser;
  if (!svc().rateLimit(user)) {
    throw mediaErr(429, "MEDIA_LIMIT", "Demasiadas requests");
  }
  const job = await svc().findOwnedJob(user, ctx.params.id, { strapi });
  if (!["queued", "running"].includes(job.status)) {
    throw mediaErr(422, "MEDIA_INVALID_REQUEST", "El job no es cancelable (estado " + job.status + ")");
  }
  const res = await svc().apiClient.cancelJob(job.mediaJobId).catch((e) => { throw svc().mapClientError(e); });
  if (res.status !== 200) throw svc().mapRemoteError(res.status, res.data);
  const r = res.data || {};
  const updatedJob = await strapi.db.query("api::media.media-job").update({
    where: { id: job.id }, data: { status: r.status || "cancelled" },
  });
  emitEvent(updatedJob, r.result === "cancelled" ? "media:job:cancelled" : "media:job:updated", user.id);
  return { id: String(job.id), result: r.result || "cancel_requested", status: r.status || "cancelled" };
}

// ---------- POST /api/media/jobs/:id/retry ----------
async function retry(ctx) {
  const user = ctx.state.strapiUser;
  if (!svc().rateLimit(user)) {
    throw mediaErr(429, "MEDIA_LIMIT", "Demasiadas requests");
  }
  const job = await svc().findOwnedJob(user, ctx.params.id, { strapi });
  if (!["failed", "cancelled", "interrupted"].includes(job.status)) {
    throw mediaErr(422, "MEDIA_INVALID_REQUEST", "El job no es reintentable (estado " + job.status + ")");
  }
  const res = await svc().apiClient.retryJob(job.mediaJobId).catch((e) => { throw svc().mapClientError(e); });
  if (res.status !== 200) throw svc().mapRemoteError(res.status, res.data);
  const r = res.data || {};
  // NUEVO MediaJob local relacionado por parentJob (no reciclar ID)
  const newRow = await strapi.db.query("api::media.media-job").create({
    data: {
      user: user.id,
      mediaJobId: r.id,
      type: job.type,
      status: r.status || "queued",
      resourceClass: job.resourceClass,
      usageContext: job.usageContext,
      priority: job.priority,
      paramsSafeJson: job.paramsSafeJson,
      warnings: [],
      parentJob: job.id,
      publishedAt: new Date(),
    },
  });
  emitEvent(newRow, "media:job:created", user.id);
  return { id: String(newRow.id), parentJobId: String(job.id), status: newRow.status };
}

// ---------- GET /api/media/jobs/:id/artifacts ----------
async function artifacts(ctx) {
  const user = ctx.state.strapiUser;
  if (!svc().rateLimit(user)) {
    throw mediaErr(429, "MEDIA_LIMIT", "Demasiadas requests");
  }
  const job = await svc().findOwnedJob(user, ctx.params.id, { strapi });
  const synced = await syncJob(job);
  if (!synced.mediaJobId) return { artifacts: [], count: 0 };
  const res = await svc().apiClient.getArtifacts(synced.mediaJobId).catch((e) => { throw svc().mapClientError(e); });
  if (res.status !== 200) throw svc().mapRemoteError(res.status, res.data);
  const arts = (res.data && res.data.artifacts) || [];
  // metadata segura: id (handle verificado en download), name, mime, size, sha256
  return {
    artifacts: arts.map((a) => ({
      id: a.id, name: sanitizeFilename(a.name), mime: a.mime_type || null,
      sizeBytes: a.size_bytes || null, sha256: a.sha256 || null,
    })),
    count: arts.length,
  };
}

// ---------- GET /api/media/jobs/:jobId/artifacts/:artifactId/download ----------
async function download(ctx) {
  const user = ctx.state.strapiUser;
  const job = await svc().findOwnedJob(user, ctx.params.id, { strapi });
  if (!svc().rateLimit(user)) {
    throw mediaErr(429, "MEDIA_LIMIT", "Demasiadas requests");
  }
  if (!job.mediaJobId) throw mediaErr(404, "MEDIA_NOT_FOUND", "Sin artifact");
  // confirmar que el artifact pertenece al job (Paso 30/31)
  const artsRes = await svc().apiClient.getArtifacts(job.mediaJobId).catch((e) => { throw svc().mapClientError(e); });
  if (artsRes.status !== 200) throw svc().mapRemoteError(artsRes.status, artsRes.data);
  const art = ((artsRes.data && artsRes.data.artifacts) || []).find((a) => a.id === ctx.params.artifactId);
  if (!art) throw mediaErr(404, "MEDIA_NOT_FOUND", "Artifact no pertenece al job");
  const range = ctx.request.headers.range;
  const res = await svc().apiClient.downloadArtifactStream(ctx.params.artifactId, range)
    .catch((e) => { throw svc().mapClientError(e); });
  if (res.status !== 200 && res.status !== 206) throw svc().mapRemoteError(res.status, res.data);
  // Content-Disposition sanitizado (Paso 33)
  const name = sanitizeFilename(art.name);
  const mediaMime = /audio|video|image/.test(res.headers["content-type"] || "") || /audio|video|image/.test(art.mime_type || "");
  ctx.set("Content-Type", res.headers["content-type"] || art.mime_type || "application/octet-stream");
  ctx.set("Content-Disposition", (mediaMime ? "inline" : "attachment") + "; filename=\"" + name + "\"");
  if (res.headers["content-range"]) ctx.set("Content-Range", res.headers["content-range"]);
  if (res.headers["accept-ranges"]) ctx.set("Accept-Ranges", res.headers["accept-ranges"]);
  if (res.headers["content-length"]) ctx.set("Content-Length", res.headers["content-length"]);
  ctx.status = res.status; // 200 o 206
  ctx.body = res.data; // stream (axios responseType stream)
  return undefined;
}

// ---------- access grant firmado (HMAC short-lived) ----------
// <audio>/<video>/<img>/<a download> no pueden enviar Bearer; la seguridad
// vive en un grant corto firmado scope a (user, job, artifact, purpose).
const crypto = require("crypto");
const ACCESS_TTL_SECONDS = Number(process.env.MEDIA_ARTIFACT_ACCESS_TTL_SECONDS || 300);
const ACCESS_PURPOSES = new Set(["preview", "download"]);

function accessSecret() {
  return process.env.JWT_SECRET || process.env.API_TOKEN_SALT || "";
}

function b64u(buf) {
  return Buffer.from(buf).toString("base64url");
}

function signAccess(payload) {
  const body = b64u(JSON.stringify(payload));
  const mac = crypto.createHmac("sha256", accessSecret()).update(body).digest("base64url");
  return body + "." + mac;
}

function verifyAccess(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 2) return null;
  const [body, mac] = parts;
  if (!body || !mac) return null;
  const expected = crypto.createHmac("sha256", accessSecret()).update(body).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try { payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")); } catch (e) { return null; }
  if (!payload || !payload.a || !payload.e || Date.now() > Number(payload.e)) return null;
  return payload;
}

// ---------- POST /api/media/jobs/:id/artifacts/:artifactId/access ----------
async function artifactAccess(ctx) {
  const user = ctx.state.strapiUser;
  if (!svc().rateLimit(user)) {
    throw mediaErr(429, "MEDIA_LIMIT", "Demasiadas requests");
  }
  const job = await svc().findOwnedJob(user, ctx.params.id, { strapi });
  if (!job.mediaJobId) throw mediaErr(404, "MEDIA_NOT_FOUND", "Sin artifact");
  // mismo control que download: el artifact pertenece al job
  const artsRes = await svc().apiClient.getArtifacts(job.mediaJobId).catch((e) => { throw svc().mapClientError(e); });
  if (artsRes.status !== 200) throw svc().mapRemoteError(artsRes.status, artsRes.data);
  const art = ((artsRes.data && artsRes.data.artifacts) || []).find((a) => a.id === ctx.params.artifactId);
  if (!art) throw mediaErr(404, "MEDIA_NOT_FOUND", "Artifact no pertenece al job");
  const purpose = ACCESS_PURPOSES.has(ctx.request.body && ctx.request.body.purpose) ? ctx.request.body.purpose : "preview";
  const payload = { a: ctx.params.artifactId, j: job.id, u: user.id, p: purpose, e: Date.now() + ACCESS_TTL_SECONDS * 1000 };
  const proto = ctx.request.headers["x-forwarded-proto"] || "https";
  const host = ctx.request.headers["x-forwarded-host"] || ctx.request.host;
  const base = process.env.PUBLIC_MEDIA_BASE_URL || (proto + "://" + host);
  const token = signAccess(payload);
  return {
    url: base + "/api/media/artifact-access/" + token,
    expiresAt: new Date(Number(payload.e)).toISOString(),
    disposition: purpose === "download" ? "attachment" : "inline",
    purpose,
  };
}

// ---------- DELETE /api/media/jobs/:id/artifacts/:artifactId ----------
async function deleteArtifact(ctx) {
  const user = ctx.state.strapiUser;
  if (!svc().rateLimit(user)) {
    throw mediaErr(429, "MEDIA_LIMIT", "Demasiadas requests");
  }
  const job = await svc().findOwnedJob(user, ctx.params.id, { strapi });
  if (!job.mediaJobId) throw mediaErr(404, "MEDIA_NOT_FOUND", "Sin artifact");
  // mismo control que download/access: el artifact pertenece al job
  const artsRes = await svc().apiClient.getArtifacts(job.mediaJobId).catch((e) => { throw svc().mapClientError(e); });
  if (artsRes.status !== 200) throw svc().mapRemoteError(artsRes.status, artsRes.data);
  const art = ((artsRes.data && artsRes.data.artifacts) || []).find((a) => a.id === ctx.params.artifactId);
  if (!art) throw mediaErr(404, "MEDIA_NOT_FOUND", "Artifact no pertenece al job");
  const del = await svc().apiClient.deleteArtifact(ctx.params.artifactId).catch((e) => { throw svc().mapClientError(e); });
  if (del.status !== 200) throw svc().mapRemoteError(del.status, del.data);
  return { deleted: true, id: ctx.params.artifactId };
}

// ---------- GET /api/media/artifact-access/:token ----------
// SIN Bearer: consumido por <audio>/<video>/<img>/<a download>. Seguridad = grant firmado.
async function artifactAccessConsume(ctx) {
  const payload = verifyAccess(ctx.params.token);
  if (!payload) {
    throw mediaErr(403, "MEDIA_ACCESS_INVALID", "Grant invalido o expirado");
  }
  const job = await strapi.db.query("api::media.media-job").findOne({ where: { id: payload.j } }).catch(() => null);
  if (!job) throw mediaErr(404, "MEDIA_NOT_FOUND", "Job no encontrado");
  if (!job.mediaJobId) throw mediaErr(404, "MEDIA_NOT_FOUND", "Sin artifact");
  // el artifact sigue perteneciendo al job (revocacion efectiva si se borro/cambio)
  const artsRes = await svc().apiClient.getArtifacts(job.mediaJobId).catch((e) => { throw svc().mapClientError(e); });
  if (artsRes.status !== 200) throw svc().mapRemoteError(artsRes.status, artsRes.data);
  const art = ((artsRes.data && artsRes.data.artifacts) || []).find((a) => a.id === payload.a);
  if (!art) throw mediaErr(404, "MEDIA_NOT_FOUND", "Artifact no pertenece al job");
  const range = ctx.request.headers.range;
  const res = await svc().apiClient.downloadArtifactStream(payload.a, range).catch((e) => { throw svc().mapClientError(e); });
  if (res.status !== 200 && res.status !== 206) throw svc().mapRemoteError(res.status, res.data);
  const name = sanitizeFilename(art.name);
  const mediaMime = /audio|video|image/.test(res.headers["content-type"] || "") || /audio|video|image/.test(art.mime_type || "");
  ctx.set("Content-Type", res.headers["content-type"] || art.mime_type || "application/octet-stream");
  ctx.set("Content-Disposition", ((payload.p === "download" || !mediaMime) ? "attachment" : "inline") + '; filename="' + name + '"');
  ctx.set("Cache-Control", "private, no-store");
  ctx.set("Referrer-Policy", "no-referrer");
  if (res.headers["content-range"]) ctx.set("Content-Range", res.headers["content-range"]);
  if (res.headers["accept-ranges"]) ctx.set("Accept-Ranges", res.headers["accept-ranges"]);
  if (res.headers["content-length"]) ctx.set("Content-Length", res.headers["content-length"]);
  ctx.status = res.status; // 200 o 206 (Range)
  ctx.body = res.data; // stream
  return undefined;
}

module.exports = { capabilities, upload, create, list, get, cancel, retry, artifacts, download, artifactAccess, artifactAccessConsume, deleteArtifact, sanitizeFilename, jobView, syncJob };

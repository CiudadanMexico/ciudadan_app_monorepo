"use strict";

/**
 * media-sync-poller (Bloque 5C): bridge Media API -> MediaJob local ->
 * Socket.IO.
 *
 * - Revisa SOLO jobs activos (queued/running); nunca la tabla historica
 *   completa.
 * - Sin jobs activos: NO hace requests a la Media API (timer dormido).
 * - Actualiza local solo si cambio; emite socket solo si hubo cambio
 *   relevante (nunca "running/running/running").
 * - Media API down: mantiene el status previo, loguea error, reintenta en
 *   el proximo intervalo (nunca marca failed en cascada).
 * - 404 remoto: marca el local con error MEDIA_REMOTE_JOB_NOT_FOUND
 *   (documentado en docs/media/bloque5c-realtime-ui.md).
 * - Una sola instancia: poller in-process (existe UN solo proceso backend;
 *   verificado con pgrep). El timer se detiene en shutdown.
 */

const core = require("./media-service");
const apiClient = core.apiClient;
const { mediaRoom } = require("../../../sockets/media-socket");

const INTERVAL_MS = (() => {
  const v = parseInt(process.env.MEDIA_JOB_SYNC_INTERVAL_MS || "", 10);
  return Number.isFinite(v) && v >= 500 ? v : 2000;
})();
const IDLE_MS = Math.max(INTERVAL_MS * 10, 15000); // sin jobs activos

function logSafe() {
  try {
    (global.strapi && global.strapi.log
      ? global.strapi.log.info
      : console.info).apply(null, arguments);
  } catch (e) { /* noop */ }
}

function logWarnSafe() {
  try {
    (global.strapi && global.strapi.log
      ? global.strapi.log.warn
      : console.warn).apply(null, arguments);
  } catch (e) { /* noop */ }
}

/** Vista segura para el payload de socket (Paso 6). */
function socketPayload(job) {
  return {
    id: String(job.id),
    type: job.type,
    status: job.status,
    resourceClass: job.resourceClass || null,
    progress: null, // la Media API no da progreso estructurado; NO inventar
    warnings: job.warnings || [],
    updatedAt: new Date().toISOString(),
    artifactsReady: job.status === "succeeded",
    errorCode: job.errorCode || null,
  };
}

async function emitToOwner(job, event, payload) {
  const io = global.strapi && global.strapi.io;
  if (!io) { logSafe(`[media-sync] emit OMITIDO (${event} job ${job.id}): io no disponible`); return; }
  // el findMany puede no traer la relacion poblada segun version/config:
  // resolver el dueno con un findOne (populate si funciopna; fallback al link)
  let user = job.user;
  if (!user || !(user.id || typeof user === "number" || typeof user === "string")) {
    try {
      const full = await global.strapi.db.query("api::media.media-job").findOne({ where: { id: job.id }, populate: ["user"] });
      if (full && full.user) user = full.user;
    } catch (e) { /* noop */ }
  }
  if (!user && job.id) {
    try {
      const rows = await global.strapi.db.connection.raw("SELECT user_id FROM media_jobs_user_links WHERE media_job_id = ? LIMIT 1", [job.id]);
      const uid = rows && rows.rows && rows.rows[0] && rows.rows[0].user_id;
      if (uid) user = { id: uid };
    } catch (e) { /* noop */ }
  }
  const userId = user && (user.id || user);
  if (!userId) { logSafe(`[media-sync] emit OMITIDO (${event} job ${job.id}): sin user resuelto`); return; }
  io.to(mediaRoom(userId)).emit(event, payload);
  logSafe(`[media-sync] emit OK (${event} job ${job.id} -> ${mediaRoom(userId)})`);
}

/** Sync de UN job activo: compara remoto vs local; emite solo si cambio. */
async function syncActiveJob(job) {
  if (!job.mediaJobId) return;
  const res = await apiClient.getJob(job.mediaJobId).catch((e) => {
    if (e.isConnDown || e.code === "ECONNREFUSED" || e.code === "EHOSTUNREACH") {
      logWarnSafe(`[media-sync] Media API down (job ${job.id}): mantengo status ${job.status}`);
    } else {
      logWarnSafe(`[media-sync] error consultando job ${job.id}:`, e.message || e);
    }
    return null;
  });

  if (!res) return; // Media API down / timeout: estado previo, reintentar

  if (res.status === 404) {
    // Paso 60: no convertir silenciosamente a succeeded/failed
    if (job.status !== "failed" || job.errorCode !== "MEDIA_REMOTE_JOB_NOT_FOUND") {
      const updated = await global.strapi.db.query("api::media.media-job").update({
        where: { id: job.id },
        data: { status: "failed", errorCode: "MEDIA_REMOTE_JOB_NOT_FOUND",
          errorMessage: "El job remoto ya no existe en la Media API" },
      });
      logSafe(`[media-sync] job ${updated.id} -> failed (MEDIA_REMOTE_JOB_NOT_FOUND)`);
      await emitToOwner(updated, "media:job:failed", socketPayload(updated));
    }
    return;
  }

  if (res.status !== 200) return;

  const r = res.data || {};
  const patch = {};
  if (r.status && r.status !== job.status) patch.status = r.status;
  if (r.started_at && !job.startedAt) patch.startedAt = new Date(r.started_at);
  if (r.finished_at && !job.finishedAt) patch.finishedAt = new Date(r.finished_at);
  if (r.error_code) patch.errorCode = r.error_code;
  if (r.error_message) patch.errorMessage = r.error_message;
  if (Array.isArray(r.warnings) && r.warnings.length &&
      JSON.stringify(r.warnings) !== JSON.stringify(job.warnings || [])) {
    patch.warnings = r.warnings;
  }

  if (!Object.keys(patch).length) return; // sin cambio: NO emitir (loro)

  const updated = await global.strapi.db.query("api::media.media-job").update({
    where: { id: job.id },
    data: patch,
  });
  logSafe(`[media-sync] job ${updated.id}: ${job.status} -> ${updated.status}`);

  const payload = socketPayload(updated);
  if (updated.status !== job.status) {
    if (updated.status === "succeeded") await emitToOwner(updated, "media:job:succeeded", payload);
    else if (updated.status === "failed") await emitToOwner(updated, "media:job:failed", payload);
    else if (updated.status === "cancelled") await emitToOwner(updated, "media:job:cancelled", payload);
    else if (updated.status === "interrupted") await emitToOwner(updated, "media:job:interrupted", payload);
    else await emitToOwner(updated, "media:job:updated", payload);
  } else {
    // cambio solo de metadata (warnings/error): evento updated
    await emitToOwner(updated, "media:job:updated", payload);
  }
}

/** Un tick del poller. */
async function tick() {
  let active;
  try {
    active = await global.strapi.db.query("api::media.media-job").findMany({
      where: { status: { $in: ["queued", "running"] } },
      populate: ["user"],
      limit: 50,
    });
  } catch (e) {
    logWarnSafe("[media-sync] error listando jobs activos:", e.message || e);
    return;
  }
  if (!active.length) return; // sin jobs activos: sin requests
  for (const job of active) {
    try {
      await syncActiveJob(job);
    } catch (e) {
      logWarnSafe(`[media-sync] error sync job ${job.id}:`, e.message || e);
    }
  }
}

let timer = null;
let stopped = false;

function startMediaSyncPoller(strapi) {
  if (timer) return timer; // idempotente
  stopped = false;
  logSafe(`[media-sync] poller iniciado (intervalo ${INTERVAL_MS}ms, idle ${IDLE_MS}ms)`);
  const schedule = (ms) => {
    timer = setTimeout(async () => {
      if (stopped) return;
      let activeCount = 0;
      try {
        activeCount = await strapi.db.query("api::media.media-job").count({
          where: { status: { $in: ["queued", "running"] } },
        });
      } catch (e) { /* reintenta */ }
      if (activeCount > 0) {
        try { await tick(); } catch (e) { logWarnSafe("[media-sync] tick error:", e.message || e); }
        schedule(INTERVAL_MS);
      } else {
        schedule(IDLE_MS); // sin jobs: timer dormido, sin requests
      }
    }, ms);
  };
  schedule(INTERVAL_MS);
  return timer;
}

function stopMediaSyncPoller() {
  stopped = true;
  if (timer) {
    clearTimeout(timer);
    timer = null;
    logSafe("[media-sync] poller detenido");
  }
}

module.exports = { startMediaSyncPoller, stopMediaSyncPoller, tick, socketPayload, emitToOwner, INTERVAL_MS };

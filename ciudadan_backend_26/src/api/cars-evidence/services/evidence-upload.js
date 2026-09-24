"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const {
  validateAndConsumeChallenge,
} = require("../../cars-validation-challenge/services/challenge-workflow");
const { logValidationEvent } = require("../../cars-validation/services/validation-audit");

const VALIDATION_UID = "api::cars-validation.cars-validation";
const EVIDENCE_UID = "api::cars-evidence.cars-evidence";
const UPLOAD_FILE_UID = "plugin::upload.file";

// docs/Verificacion_Conductores_v2.docx, sección 33 ("Reglas del backend"):
// "Validar MIME y tamaño" — antes no se validaba nada del archivo ya subido
// a la librería de medios, solo se confiaba en que existiera.
const VIDEO_EVIDENCE_TYPES = new Set(["video_360"]);
const FLEXIBLE_EVIDENCE_TYPES = new Set(["official_query_capture", "incident"]);
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 150 * 1024 * 1024;

const badRequest = (message) => {
  const error = new Error(message);
  error.status = 400;
  return error;
};

const notFound = (message) => {
  const error = new Error(message);
  error.status = 404;
  return error;
};

const assertMimeAndSize = (type, file) => {
  const mime = file.mime || "";
  const isImage = mime.startsWith("image/");
  const isVideo = mime.startsWith("video/");
  const isPdf = mime === "application/pdf";

  let allowed;
  if (VIDEO_EVIDENCE_TYPES.has(type)) {
    allowed = isVideo;
  } else if (FLEXIBLE_EVIDENCE_TYPES.has(type)) {
    allowed = isImage || isVideo || isPdf;
  } else {
    allowed = isImage;
  }

  if (!allowed) {
    throw badRequest(
      `El archivo (${mime || "tipo desconocido"}) no es un formato válido para el paso "${type}".`
    );
  }

  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  const sizeBytes = (file.size || 0) * 1024; // Strapi guarda `size` en KB
  if (sizeBytes > maxBytes) {
    throw badRequest(
      `El archivo pesa demasiado (${Math.round(sizeBytes / 1024 / 1024)}MB, máximo ${Math.round(
        maxBytes / 1024 / 1024
      )}MB).`
    );
  }
};

// Solo funciona con el proveedor local de uploads (default en este proyecto,
// sin config en plugins.js) — la ruta fisica vive bajo public + file.url.
const readUploadedFileBuffer = async (strapi, fileId) => {
  const file = await strapi.entityService.findOne(UPLOAD_FILE_UID, fileId);
  if (!file) throw badRequest("El archivo subido (fileId) no existe.");

  const absolutePath = path.join(strapi.dirs.static.public, file.url);
  const buffer = await fs.promises.readFile(absolutePath);
  return { file, buffer };
};

/**
 * docs/TAXIS-VERIFICACION-CONDUCTORES-FASES.md, Fase 2: recibe una evidencia
 * ya capturada en vivo (foto/video subido previamente a /api/upload) y:
 *  - valida y consume el nonce de un solo uso emitido en la Fase 1,
 *  - recalcula server_sha256 sobre los bytes reales (unico hash canonico),
 *  - detecta (no bloquea; deja senal para el motor de riesgo de la Fase 5)
 *    discrepancia cliente/servidor y duplicados por hash,
 *  - es idempotente por `idempotencyKey` para que una caida de red no
 *    duplique la evidencia.
 */
const uploadEvidence = async (
  strapi,
  {
    validationId,
    type,
    fileId,
    clientSha256,
    nonceId,
    sessionId,
    gpsLat,
    gpsLng,
    gpsAccuracy,
    clientTimestamp,
    locationSource,
    deviceId,
    appVersion,
    idempotencyKey,
    actorId,
  }
) => {
  if (!validationId) throw badRequest("validationId es requerido.");
  if (!type) throw badRequest("type es requerido.");
  if (!fileId) throw badRequest("fileId es requerido.");

  const validation = await strapi.entityService.findOne(
    VALIDATION_UID,
    validationId
  );
  if (!validation) throw notFound("Validación no encontrada.");

  if (idempotencyKey) {
    const [existing] = await strapi.entityService.findMany(EVIDENCE_UID, {
      filters: { validation: validationId, idempotency_key: idempotencyKey },
      limit: 1,
    });
    if (existing) return { evidence: existing, deduped: true };
  }

  // Fase 1: nonce de un solo uso, ligado al paso (el `type` de la evidencia
  // es el `step` que se autorizo al emitir el challenge).
  await validateAndConsumeChallenge(strapi, {
    nonceId,
    sessionId,
    step: type,
  });

  const { file, buffer } = await readUploadedFileBuffer(strapi, fileId);
  assertMimeAndSize(type, file);
  const serverSha256 = crypto.createHash("sha256").update(buffer).digest("hex");

  const flags = [];
  if (clientSha256 && clientSha256 !== serverSha256) {
    flags.push("hash_mismatch_client_server");
  }

  const duplicates = await strapi.entityService.findMany(EVIDENCE_UID, {
    filters: {
      validation: validationId,
      server_sha256: serverSha256,
      is_current: true,
    },
    limit: 1,
  });
  if (duplicates.length) flags.push("duplicate_hash");

  const now = new Date();
  const evidence = await strapi.entityService.create(EVIDENCE_UID, {
    data: {
      validation: validationId,
      type,
      file: fileId,
      client_sha256: clientSha256 || null,
      server_sha256: serverSha256,
      nonce: nonceId,
      idempotency_key: idempotencyKey || null,
      origin: "live_capture",
      timestamp_client: clientTimestamp || null,
      timestamp_server: now,
      gps_lat: gpsLat ?? null,
      gps_lng: gpsLng ?? null,
      gps_accuracy: gpsAccuracy ?? null,
      device_id: deviceId || null,
      app_version: appVersion || null,
      uploaded_from_gallery: false,
      is_valid: flags.length === 0,
      validation_flags: {
        flags,
        location_source: locationSource || null,
      },
    },
  });

  // docs/Verificacion_Conductores_v2.docx, sección 8: "evidence_uploaded —
  // Recepción" y "evidence_validated — Validación automática" son dos
  // eventos distintos del documento fuente (no el mismo "evidence_synced"
  // que ya existía para el reupload desde el teléfono del conductor,
  // Fase 0 — ese es un origen diferente y se conserva sin tocar).
  await logValidationEvent(strapi, {
    validationId,
    evidenceId: evidence.id,
    actorId,
    action: "evidence_uploaded",
    payload: { type, flags, origin: "live_capture" },
  });

  if (flags.length === 0) {
    await logValidationEvent(strapi, {
      validationId,
      evidenceId: evidence.id,
      actorId,
      action: "evidence_validated",
      payload: { type },
    });
  }

  return { evidence, deduped: false };
};

module.exports = { uploadEvidence };

"use strict";

/**
 * mediaApiClient (Bloque 5B): cliente server-to-server hacia la Ciudadan
 * Media API (100.73.191.3:8090). SOLO backend — nunca exportar al frontend.
 * Credencial: CIUDADAN_MEDIA_API_TOKEN (env privada del backend).
 * Timeouts acotados; NUNCA esperar 30 min por jobs heavy.
 */

const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const MEDIA_API_URL = process.env.CIUDADAN_MEDIA_API_URL || "http://100.73.191.3:8090";
const MEDIA_API_TOKEN = process.env.CIUDADAN_MEDIA_API_TOKEN || "";

// Timeouts en MILISEGUNDOS (axios los interpreta en ms; valores en
// segundos rompen en axios >= 1.x moderno, que aplica el timeout
// estrictamente).
const T = {
  health: 5000,
  status: 5000,
  capabilities: 8000,
  submit: 15000,
  getStatus: 10000,
  uploadBase: 120000,
  downloadBase: 120000,
};

function client() {
  return axios.create({
    baseURL: MEDIA_API_URL,
    timeout: T.status,
    headers: { Authorization: "Bearer " + MEDIA_API_TOKEN },
    // no seguir redirects; la Media API no redirige
    maxRedirects: 0,
    validateStatus: null, // el servicio mapea el status
  });
}

/**
 * Request con retry por timeout reutilizando la misma Idempotency-Key
 * (Paso 36: un create logico no debe duplicar jobs).
 */
async function request(method, path, { timeout, data, headers, idempotencyKey, retries, responseType } = {}) {
  const opts = { method, url: path, timeout: timeout || T.status, headers: headers || {} };
  if (responseType) opts.responseType = responseType;
  if (idempotencyKey) opts.headers["Idempotency-Key"] = idempotencyKey;
  if (data !== undefined) opts.data = data;
  const c = client();
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt += 1;
    try {
      return await c.request(opts);
    } catch (err) {
      const isTimeout = err.code === "ECONNABORTED" || /timeout/i.test(String(err.message));
      const isConn = ["ECONNREFUSED", "EHOSTUNREACH", "ENETUNREACH", "ECONNRESET"].includes(err.code);
      if ((isTimeout || isConn) && attempt <= (retries || 1)) {
        continue; // mismo idempotency key
      }
      err.isTimeout = isTimeout;
      err.isConnDown = isConn;
      throw err;
    }
  }
}

async function health() {
  const c = axios.create({ baseURL: MEDIA_API_URL, timeout: T.health, validateStatus: null });
  return c.get("/health");
}

async function getCapabilities() {
  return request("GET", "/v1/capabilities", { timeout: T.capabilities, retries: 2 });
}

async function getStatus() {
  return request("GET", "/v1/status", { timeout: T.status });
}

async function createJob(type, params, usageContext, priority, idempotencyKey) {
  return request("POST", "/v1/jobs", {
    timeout: T.submit,
    data: { type, params, usage_context: usageContext, priority },
    headers: { "Content-Type": "application/json" },
    idempotencyKey,
    retries: 1,
  });
}

async function getJob(mediaJobId) {
  return request("GET", "/v1/jobs/" + encodeURIComponent(mediaJobId), { timeout: T.getStatus });
}

async function listJobs(filters) {
  return request("GET", "/v1/jobs", { timeout: T.getStatus, data: undefined, headers: {}, params: filters });
}

async function cancelJob(mediaJobId) {
  return request("POST", "/v1/jobs/" + encodeURIComponent(mediaJobId) + "/cancel", {
    timeout: T.submit, data: {}, headers: { "Content-Type": "application/json" }, retries: 0,
  });
}

async function retryJob(mediaJobId) {
  return request("POST", "/v1/jobs/" + encodeURIComponent(mediaJobId) + "/retry", {
    timeout: T.submit, data: {}, headers: { "Content-Type": "application/json" }, retries: 0,
  });
}

async function getEvents(mediaJobId) {
  return request("GET", "/v1/jobs/" + encodeURIComponent(mediaJobId) + "/events", { timeout: T.getStatus });
}

async function getArtifacts(mediaJobId) {
  return request("GET", "/v1/jobs/" + encodeURIComponent(mediaJobId) + "/artifacts", { timeout: T.getStatus });
}

/**
 * Upload en STREAM (Paso 18): read stream + form-data; sin cargar el
 * archivo completo en RAM. filepath = path del temp file que Strapi ya
 * escribio en disco (busboy).
 */
async function uploadStream(filepath, filename, sizeBytes, idempotencyKey) {
  const form = new FormData();
  form.append("file", fs.createReadStream(filepath), { filename, knownLength: sizeBytes });
  const timeout = Math.min(T.uploadBase + Math.ceil(sizeBytes / (1024 * 1024)), 600);
  const headers = Object.assign({ "Content-Length": form.getLengthSync() }, form.getHeaders());
  return request("POST", "/v1/uploads", { timeout, data: form, headers, idempotencyKey, retries: 1 });
}

/**
 * Download en STREAM con Range propagado (Paso 31/32). Devuelve la response
 * de axios con responseType stream (el service la pipa al cliente).
 */
/** DELETE de un artifact (remueve registro + archivo en la Media API). */
async function deleteArtifact(artifactId) {
  return request("DELETE", "/v1/artifacts/" + encodeURIComponent(artifactId), { timeout: T.getStatus });
}

async function downloadArtifactStream(artifactId, rangeHeader) {
  const headers = {};
  if (rangeHeader) headers.Range = rangeHeader;
  return request("GET", "/v1/artifacts/" + encodeURIComponent(artifactId), {
    timeout: T.downloadBase, headers, responseType: "stream",
  });
}

module.exports = { deleteArtifact,
  MEDIA_API_URL,
  T,
  health, getCapabilities, getStatus, createJob, getJob, listJobs,
  cancelJob, retryJob, getEvents, getArtifacts, uploadStream,
  downloadArtifactStream,
};

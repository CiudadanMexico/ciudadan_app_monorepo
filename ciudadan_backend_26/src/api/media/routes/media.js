"use strict";

/**
 * Rutas del modulo media (Bloque 5B). Prefijo /api (Strapi v4).
 * Autenticacion: global::is-authenticated-media (Auth0 o JWT local
 * users-permissions — ambos EXISTENTES del backend).
 * NO hay ruta publica de media; el navegador NUNCA llega a la Media API.
 */

const routes = [
  { method: "GET", path: "/media/capabilities", handler: "media.capabilities",
    config: { auth: false, policies: ["global::is-authenticated-media"] } },
  { method: "POST", path: "/media/uploads", handler: "media.upload",
    config: { auth: false, policies: ["global::is-authenticated-media"] } },
  { method: "GET", path: "/media/jobs", handler: "media.list",
    config: { auth: false, policies: ["global::is-authenticated-media"] } },
  { method: "POST", path: "/media/jobs", handler: "media.create",
    config: { auth: false, policies: ["global::is-authenticated-media"] } },
  { method: "GET", path: "/media/jobs/:id", handler: "media.get",
    config: { auth: false, policies: ["global::is-authenticated-media"] } },
  { method: "POST", path: "/media/jobs/:id/cancel", handler: "media.cancel",
    config: { auth: false, policies: ["global::is-authenticated-media"] } },
  { method: "POST", path: "/media/jobs/:id/retry", handler: "media.retry",
    config: { auth: false, policies: ["global::is-authenticated-media"] } },
  { method: "GET", path: "/media/jobs/:id/artifacts", handler: "media.artifacts",
    config: { auth: false, policies: ["global::is-authenticated-media"] } },
  { method: "GET", path: "/media/jobs/:id/artifacts/:artifactId/download", handler: "media.download",
    config: { auth: false, policies: ["global::is-authenticated-media"] } },
  { method: "POST", path: "/media/jobs/:id/artifacts/:artifactId/access", handler: "media.artifactAccess",
    config: { auth: false, policies: ["global::is-authenticated-media"] } },
  { method: "GET", path: "/media/artifact-access/:token", handler: "media.artifactAccessConsume",
    config: { auth: false, policies: [] } },
];

module.exports = { routes };

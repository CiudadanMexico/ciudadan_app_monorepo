"use strict";

/**
 * Controller del modulo media (Bloque 5B): delega en media-service.
 * Sin logica de negocio aqui (convenciones: controller delgado).
 */

const service = require("../services/media-service");
const actions = require("../services/media-actions");

function handle(promise, ctx) {
  return promise.then((out) => {
    if (out && out.__raw__) { // streaming (download)
      return undefined;
    }
    if (!ctx.body && out) ctx.body = out;
    return out;
  }).catch((err) => {
    const e = err.isMedia !== false && service.MediaError.prototype.isPrototypeOf(err)
      ? err : service.mapClientError(err);
    ctx.status = e.status;
    ctx.body = { error: { code: e.code, message: e.message } };
  });
}

module.exports = {
  async capabilities(ctx) {
    return handle(actions.capabilities(ctx), ctx);
  },
  async upload(ctx) {
    return handle(actions.upload(ctx), ctx);
  },
  async create(ctx) {
    return handle(actions.create(ctx), ctx);
  },
  async list(ctx) {
    return handle(actions.list(ctx), ctx);
  },
  async get(ctx) {
    return handle(actions.get(ctx), ctx);
  },
  async cancel(ctx) {
    return handle(actions.cancel(ctx), ctx);
  },
  async retry(ctx) {
    return handle(actions.retry(ctx), ctx);
  },
  async artifacts(ctx) {
    return handle(actions.artifacts(ctx), ctx);
  },
  async download(ctx) {
    return handle(actions.download(ctx), ctx);
  },
  async artifactAccess(ctx) {
    return handle(actions.artifactAccess(ctx), ctx);
  },
  async artifactAccessConsume(ctx) {
    return handle(actions.artifactAccessConsume(ctx), ctx);
  },
  async deleteArtifact(ctx) {
    return handle(actions.deleteArtifact(ctx), ctx);
  },
};

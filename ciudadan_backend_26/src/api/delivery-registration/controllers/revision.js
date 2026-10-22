'use strict';

const fs = require('fs');

/**
 * Revision de agencia (socio/admin/root de la MISMA agencia del expediente).
 * La policy is-delivery-reviewer ya dejo ctx.state.strapiUser con agencia;
 * el ambito fino, la vigencia del socio y la no-auto-aprobacion los aplica
 * revision-service en CADA accion.
 */
module.exports = {
  async cola(ctx) {
    const { cola } = require('../services/revision-service');
    const resultado = await cola(ctx.state.strapiUser, {
      status: ctx.query?.status,
      limit: ctx.query?.limit,
      start: ctx.query?.start,
    });
    ctx.body = { ok: true, ...resultado };
  },

  async detalle(ctx) {
    const { detalle } = require('../services/revision-service');
    const resultado = await detalle(ctx.state.strapiUser, ctx.params.id);
    ctx.body = { ok: true, ...resultado };
  },

  async servirEvidencia(ctx) {
    const { evidenciaParaRevisor } = require('../services/revision-service');
    const { rutaAbsoluta } = require('../services/evidencias-service');

    const propio = await evidenciaParaRevisor(ctx.state.strapiUser, ctx.params.id, ctx.params.fileId);

    ctx.set('Content-Type', propio.file.mime || 'application/octet-stream');
    ctx.set('Cache-Control', 'private, no-store');
    const nombreSeguro = String(propio.file.name || 'evidencia').replace(/[^a-zA-Z0-9._-]/g, '_');
    ctx.set('Content-Disposition', `inline; filename="${nombreSeguro}"`);
    ctx.body = fs.createReadStream(rutaAbsoluta(propio.file));
  },

  async registrarCotejo(ctx) {
    const { registrarCotejo } = require('../services/revision-service');
    const resultado = await registrarCotejo(ctx.state.strapiUser, ctx.params.id, ctx.request.body || {});
    ctx.body = {
      ok: true,
      evento: { id: resultado.evento.id, action: resultado.evento.action, review_version: resultado.evento.review_version },
      senal: resultado.senal,
    };
  },

  async pedirCorrecciones(ctx) {
    const { pedirCorrecciones } = require('../services/revision-service');
    const resultado = await pedirCorrecciones(ctx.state.strapiUser, ctx.params.id, ctx.request.body || {});
    ctx.body = { ok: true, ...resultado };
  },

  async marcarElegibleVideo(ctx) {
    const { marcarElegibleVideo } = require('../services/revision-service');
    const resultado = await marcarElegibleVideo(ctx.state.strapiUser, ctx.params.id);
    ctx.body = { ok: true, ...resultado };
  },

  async registrarValidacionZoom(ctx) {
    const { registrarValidacionZoom } = require('../services/revision-service');
    const resultado = await registrarValidacionZoom(ctx.state.strapiUser, ctx.params.id, ctx.request.body || {});
    ctx.body = { ok: true, ...resultado };
  },

  async aprobar(ctx) {
    const { aprobar } = require('../services/revision-service');
    const resultado = await aprobar(ctx.state.strapiUser, ctx.params.id);
    ctx.body = { ok: true, ...resultado };
  },

  async rechazar(ctx) {
    const { rechazar } = require('../services/revision-service');
    const resultado = await rechazar(ctx.state.strapiUser, ctx.params.id, ctx.request.body || {});
    ctx.body = { ok: true, ...resultado };
  },

  async suspender(ctx) {
    const { suspender } = require('../services/revision-service');
    const resultado = await suspender(ctx.state.strapiUser, ctx.params.id, ctx.request.body || {});
    ctx.body = { ok: true, ...resultado };
  },

  async revalidar(ctx) {
    const { revalidar } = require('../services/revision-service');
    const resultado = await revalidar(ctx.state.strapiUser, ctx.params.id);
    ctx.body = { ok: true, ...resultado };
  },

  async reabrir(ctx) {
    const { reabrir } = require('../services/revision-service');
    const resultado = await reabrir(ctx.state.strapiUser, ctx.params.id, ctx.request.body || {});
    ctx.body = { ok: true, ...resultado };
  },
};

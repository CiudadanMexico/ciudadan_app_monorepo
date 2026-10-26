'use strict';

const fs = require('fs');

/**
 * Evidencias del expediente: adjunto validado (slot/file_id) y descarga
 * PRIVADA por streaming. La URL estatica de /uploads jamas se entrega: solo
 * file_id + este endpoint autenticado (titular o revisor de la agencia).
 */
module.exports = {
  async adjuntar(ctx) {
    const { adjuntarEvidencia } = require('../services/evidencias-service');
    const resultado = await adjuntarEvidencia({ user: ctx.state.strapiUser, body: ctx.request.body || {} });
    ctx.body = { ok: true, ...resultado };
  },

  async servir(ctx) {
    const { UIDS } = require('../utils/constants');
    const { archivoPropio, rutaAbsoluta } = require('../services/evidencias-service');

    const strapi = global.strapi;
    const user = ctx.state.strapiUser;
    const profile = await strapi.db.query(UIDS.PROFILE).findOne({ where: { user: user.id } });
    if (!profile) return ctx.notFound('No tienes expediente de repartidor');

    const propio = await archivoPropio(profile, Number(ctx.params.fileId));
    if (!propio) return ctx.notFound('Evidencia no encontrada en tu expediente');

    ctx.set('Content-Type', propio.file.mime || 'application/octet-stream');
    ctx.set('Cache-Control', 'private, no-store');
    const nombreSeguro = String(propio.file.name || 'evidencia').replace(/[^a-zA-Z0-9._-]/g, '_');
    ctx.set('Content-Disposition', `inline; filename="${nombreSeguro}"`);
    ctx.body = fs.createReadStream(rutaAbsoluta(propio.file));
  },
};

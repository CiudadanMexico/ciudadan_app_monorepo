'use strict';
/**
 * fix-ads-media.js — Vincula los uploads reales del usuario al anuncio
 * "Descubre Ciudadan en 15s" (id 5).
 *  - archivo  = file id 4 (puros_independientes.mp4)
 *  - thumbnail = file id 5 (02_Criptomoneda_Complementaria.png)
 * Después, el backend servirá el video real subido en lugar del fallback
 * del seed (metadata.archivo_url de google).
 *
 * Uso: node fix-ads-media.js   (desde ciudadan_backend_26/)
 */
process.env.DATABASE_CLIENT = process.env.DATABASE_CLIENT || 'sqlite';
const Strapi = require('@strapi/strapi');
const fs = require('fs');

const LOG = 'C:/Users/elyiz/AppData/Local/Temp/cline/fix_media.log';
function log(m) {
  try { fs.appendFileSync(LOG, m + '\n'); } catch (e) {}
}

(async () => {
  log('--- fix-ads-media INICIO ' + new Date().toISOString() + ' ---');
  let app;
  try {
    app = await Strapi({ dir: process.cwd() }).load();
    log('Strapi cargado OK');
    const AD_UID = 'api::ad.ad';

    const ad = await app.entityService.findOne(AD_UID, 5, { populate: ['archivo', 'thumbnail'] });
    if (!ad) { log('AD 5 NO EXISTE'); return; }
    log('AD 5: ' + ad.titulo + ' | archivo=' + JSON.stringify(ad.archivo) + ' | thumb=' + JSON.stringify(ad.thumbnail));

    const updates = {};
    if (!ad.archivo || ad.archivo.length === 0) {
      updates.archivo = { set: [4] };
    }
    if (!ad.thumbnail || ad.thumbnail.length === 0) {
      updates.thumbnail = { set: [5] };
    }

    if (Object.keys(updates).length > 0) {
      const upd = await app.entityService.update(AD_UID, 5, { data: updates });
      log('UPDATE OK: archivo=' + JSON.stringify(upd.archivo) + ' thumb=' + JSON.stringify(upd.thumbnail));
    } else {
      log('Ya estaban vinculados; sin cambios.');
    }

    // Verificación
    const ver = await app.entityService.findOne(AD_UID, 5, { populate: ['archivo', 'thumbnail'] });
    log('VERIF archivo: ' + (ver.archivo && ver.archivo.length ? ver.archivo[0].url : 'VACÍO'));
    log('VERIF thumb: ' + (ver.thumbnail && ver.thumbnail.length ? ver.thumbnail[0].url : 'VACÍO'));
    log('FIX COMPLETADO OK');
  } catch (err) {
    log('ERROR: ' + (err && err.stack ? err.stack : String(err)));
  } finally {
    if (app) await app.destroy();
  }
})();
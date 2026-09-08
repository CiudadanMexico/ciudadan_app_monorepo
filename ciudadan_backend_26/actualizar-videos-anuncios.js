'use strict';
// Vincula los 3 anuncios publicitarios (8, 9, 10) a los videos REALES subidos
// en Strapi (locale /uploads/...), en lugar de los mp4 de Google que están
// bloqueados (AccessDenied) y hacían que el video terminara a los ~7s.
// Uso: node actualizar-videos-anuncios.js  (desde ciudadan_backend_26/)
process.env.DATABASE_CLIENT = process.env.DATABASE_CLIENT || 'sqlite';
const Strapi = require('@strapi/strapi');

(async () => {
  let app;
  try {
    app = await Strapi({ dir: process.cwd() }).load();
    const AD_UID = 'api::ad.ad';
    const PLAN = [
      { adId: 8, fileId: 4 },  // puros_independientes.mp4
      { adId: 9, fileId: 6 },  // zapatavive.mp4
      { adId: 10, fileId: 8 }, // Cat_hacktivist_making_victory.mp4
    ];
    for (const { adId, fileId } of PLAN) {
      const ad = await app.entityService.findOne(AD_UID, adId, { populate: ['archivo'] });
      if (!ad) { console.log(`AD ${adId} NO EXISTE`); continue; }
      const file = await app.db.query('plugin::upload.file').findOne({ where: { id: fileId } });
      console.log(`  AD ${adId} "${ad.titulo}" -> file ${fileId} ${file?.url}`);
      const upd = await app.entityService.update(AD_UID, adId, {
        data: {
          archivo: fileId,
          metadata: {
            ...(ad.metadata || {}),
            archivo_url: file?.url || '',
          },
        },
      });
      const ver = await app.entityService.findOne(AD_UID, adId, { populate: ['archivo'] });
      console.log(`  -> OK archivo=${ver.archivo?.url || ver.archivo?.[0]?.url || 'VACÍO'} metadata=${JSON.stringify(ver.metadata?.archivo_url)}`);
    }
    console.log('ACTUALIZACION COMPLETADA');
  } catch (err) {
    console.error('ERROR', err.stack || err.message);
  } finally {
    if (app) await app.destroy();
  }
})();
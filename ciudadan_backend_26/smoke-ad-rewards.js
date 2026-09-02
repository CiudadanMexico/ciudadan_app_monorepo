'use strict';
// Smoke test end-to-end del backend de anuncios remunerados.
// Arranca Strapi (dev/sqlite) y ejecuta el flujo completo contra los
// controllers custom con un ctx mockeado (strapiUser id=2, que tiene cartera):
// grid → sesión → estados → heartbeats 1s reales → completar → verificar pago.
const fs = require('fs');
const LOG = 'C:/Users/elyiz/AppData/Local/Temp/cline/smoke_ad.log';
const log = (m) => {
  const s = typeof m === 'string' ? m : JSON.stringify(m);
  try { fs.appendFileSync(LOG, s + '\n'); } catch (e) { /* noop */ }
};
process.on('uncaughtException', (e) => log('UNCAUGHT: ' + (e.stack || e.message)));
process.on('unhandledRejection', (e) => log('UNHANDLED: ' + (e && e.stack ? e.stack : String(e))));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const Strapi = require('@strapi/strapi');

(async () => {
  try { fs.writeFileSync(LOG, '--- smoke INICIO ' + new Date().toISOString() + ' ---\n'); } catch (e) { /* noop */ }
  const app = await Strapi({ dir: process.cwd() }).load();
  log('Strapi cargado OK');
  const USER_ID = 2; // elyizuz420@gmail.com (cartera #6 existente)
  const adCtrl = app.api['ad'].controllers['ad'];
  const ctrl = app.api['ad-session'].controllers['ad-session'];

  const mkCtx = ({ body = {}, params = {} } = {}) => ({
    state: { strapiUser: { id: USER_ID } },
    request: { body, headers: {} },
    params,
    query: {},
    throw: (code, msg) => {
      const err = new Error('THROW ' + code + ': ' + (msg || ''));
      err.code = code;
      throw err;
    },
    body: null,
  });

  try {
    // 1. Grid de anuncios publicitarios
    const ctxGrid = mkCtx();
    await adCtrl.findPublicitarios(ctxGrid);
    const ads = (ctxGrid.body && ctxGrid.body.data) || [];
    log('GRID: ' + ads.length + ' anuncios -> ' +
      ads.map((a) => '#' + a.id + ' ' + a.titulo + ' (' + a.duracion + 's, ' + a.recompensa + ')').join(' | '));
    if (!ads.length) throw new Error('Sin anuncios publicitarios');

    // 2. Iniciar sesión con los 2 primeros
    const ctxStart = mkCtx({ body: { adIds: ads.slice(0, 2).map((a) => a.id) } });
    await ctrl.iniciarSesion(ctxStart);
    const ses = ctxStart.body && ctxStart.body.data;
    log('SESION: id=' + (ses && ses.sesionId) + ' token=' + String(ses && ses.token).slice(0, 8) + '... items=' + (ses && ses.items ? ses.items.length : 0));
    if (!ses || !ses.items || !ses.items.length) throw new Error('Sesión sin items');
    // Elegimos el item con el video más corto para que el smoke cubra su
    // duración completa con heartbeats reales (1 por segundo).
    const item = ses.items.reduce(
      (min, it) => ((Number(it.duracion || 0) < Number(min.duracion || 0) ? it : min)),
      ses.items[0]
    );
    log('ITEM0: id=' + item.id + ' duracion=' + item.duracion + 's dw=' + item.decisionWindow + 's url=' + String(item.archivo_url).slice(0, 70));

    // 3. Máquina de estados: playing → decision_window → committed
    for (const est of ['playing', 'decision_window', 'committed']) {
      const c = mkCtx({
        params: { id: String(ses.sesionId), itemId: String(item.id) },
        body: { token: ses.token, itemId: item.id, estado: est },
      });
      await ctrl.cambiarEstado(c);
      log('ESTADO ' + est + ': ' + JSON.stringify((c.body && c.body.data) || c.body));
    }

    // 4. Heartbeats reales (~1s cada uno) hasta cubrir TODA la duración (+2s margen)
    const dur = Number(item.duracion || 15);
    for (let t = 1; t <= Math.ceil(dur) + 2; t++) {
      const c = mkCtx({
        params: { id: String(ses.sesionId) },
        body: {
          token: ses.token,
          itemId: item.id,
          currentTime: Math.min(t, dur),
          playing: true,
          visible: true,
          focused: true,
        },
      });
      await ctrl.heartbeat(c);
      log('HB t=' + t + ': ' + JSON.stringify((c.body && c.body.data) || c.body));
      await sleep(1000);
    }

    // 5. Completar → emisión de recompensa
    const ctxDone = mkCtx({
      params: { id: String(ses.sesionId), itemId: String(item.id) },
      body: { token: ses.token, itemId: item.id },
    });
    await ctrl.completarAnuncio(ctxDone);
    log('COMPLETAR: ' + JSON.stringify(ctxDone.body));

    // 6. Verificación en DB: cartera y pagos
    const cartera = await app.db.query('api::cartera.cartera').findOne({ where: { user_id: USER_ID } });
    log('CARTERA: saldo=' + (cartera && cartera.laborysSaldo) + ' ganados=' + (cartera && cartera.laborysGanados));
    const pagos = await app.db.query('api::laborys-payment.laborys-payment')
      .findMany({ where: { type: 'ad_reward' }, limit: 5, sort: { id: 'desc' } });
    log('PAGOS ad_reward: ' + pagos.length + ' -> ' + JSON.stringify(pagos.map((p) => ({ id: p.id, ammount: p.ammount, status: p.status }))));

    log('=== SMOKE OK ===');
  } catch (e) {
    log('SMOKE ERROR: ' + (e.stack || e.message));
  } finally {
    try { await app.destroy(); } catch (e) { log('destroy: ' + e.message); }
    log('Strapi destruido');
  }
})();

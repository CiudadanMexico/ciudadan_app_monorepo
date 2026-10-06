'use strict';

/**
 * Envío masivo del correo de lanzamiento (lo invoca el cron config/cron-tasks.js).
 *
 * Reglas:
 *  - si no hay `launch_at` o aún no llega la fecha → no hace nada;
 *  - sólo leads con `wants_launch_email` + `email_consent`, sin enviar y con
 *    menos de 5 intentos;
 *  - se procesa en lotes paginados (nunca un find sin límite);
 *  - un fallo puntual nunca tumba Strapi: se registra y sigue.
 */

const { enviarCorreoLanzamiento } = require('./brevo');
const { formatearLanzamiento } = require('../utils/fecha');

const LEAD = 'api::driver-launch-lead.driver-launch-lead';
const LOTE = 50;
const MAX_PAGINAS = 20;
const MAX_INTENTOS = 5;

async function enviarLote({ ahora = Date.now(), limite = LOTE } = {}) {
  const config = await strapi.service('api::driver-membership-config.driver-membership-config').getConfig();
  if (!config.launch_at) return { enviados: 0, fallidos: 0, procesados: 0, razon: 'sin_launch_at' };
  if (ahora < Date.parse(config.launch_at)) return { enviados: 0, fallidos: 0, procesados: 0, razon: 'no_es_la_fecha' };

  const query = strapi.db.query(LEAD);
  const fecha = formatearLanzamiento(config.launch_at);
  const frontendUrl = (process.env.PUBLIC_FRONTEND_URL || 'https://ciudadan.org').replace(/\/$/, '');
  const resumen = { enviados: 0, fallidos: 0, procesados: 0 };
  let despues = 0;

  for (let pagina = 0; pagina < MAX_PAGINAS; pagina += 1) {
    const leads = await query.findMany({
      where: {
        wants_launch_email: true,
        email_consent: true,
        launch_email_status: { $ne: 'sent' },
        launch_email_attempts: { $lt: MAX_INTENTOS },
        id: { $gt: despues },
      },
      select: ['id', 'email', 'launch_email_attempts'],
      orderBy: { id: 'ASC' },
      limit: Math.min(limite, LOTE),
    });
    if (!leads.length) break;

    for (const lead of leads) {
      resumen.procesados += 1;
      try {
        await query.update({ where: { id: lead.id }, data: { launch_email_status: 'sending' } });
        const resultado = await enviarCorreoLanzamiento({
          email: lead.email,
          launchDate: fecha,
          downloadUrl: `${frontendUrl}/descargar`,
          params: { launchDate: fecha, downloadUrl: `${frontendUrl}/descargar`, launchTitle: config.launch_title },
        });

        if (resultado.ok) {
          await query.update({
            where: { id: lead.id },
            data: {
              launch_email_status: 'sent',
              launch_email_sent_at: new Date().toISOString(),
              brevo_message_id: resultado.messageId || null,
              launch_email_last_error: null,
            },
          });
          resumen.enviados += 1;
        } else {
          const intentos = (lead.launch_email_attempts || 0) + 1;
          await query.update({
            where: { id: lead.id },
            data: {
              launch_email_attempts: intentos,
              launch_email_status: intentos >= MAX_INTENTOS ? 'failed' : 'pending',
              launch_email_last_error: resultado.error,
            },
          });
          resumen.fallidos += 1;
        }
      } catch (error) {
        resumen.fallidos += 1;
        strapi.log.error(`[launch-mailer] Lead ${lead.id} sin enviar (${error.message || error})`);
        try {
          await query.update({
            where: { id: lead.id },
            data: {
              launch_email_attempts: (lead.launch_email_attempts || 0) + 1,
              launch_email_status: (lead.launch_email_attempts || 0) + 1 >= MAX_INTENTOS ? 'failed' : 'pending',
              launch_email_last_error: String(error.message || error).slice(0, 500),
            },
          });
        } catch (intentoErr) {
          strapi.log.error(`[launch-mailer] No se pudo actualizar el lead ${lead.id}`);
        }
      }
    }

    despues = leads[leads.length - 1].id;
    if (leads.length < Math.min(limite, LOTE)) break;
  }
  return resumen;
}

module.exports = { enviarLote, LOTE, MAX_INTENTOS };

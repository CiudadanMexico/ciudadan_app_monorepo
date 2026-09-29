'use strict';

/**
 * Tareas programadas del backend (se cargan desde src/index.js → schedules).
 *
 * driver-launch-ticker: revisa cada 15 minutos si ya llegó la fecha de
 * lanzamiento y, en ese caso, envía en lotes el correo a los leads con
 * consentimiento. Si `launch_at` es null o aún no llega, no hace nada.
 */

module.exports = {
  'driver-launch-ticker': {
    schedule: '*/15 * * * *',
    options: {
      timezone: 'America/Mexico_City',
    },
    async task() {
      try {
        const resumen = await strapi.service('api::driver-launch-lead.launch-mailer').enviarLote();
        if (resumen.procesados || (resumen.razon && resumen.razon !== 'no_es_la_fecha')) {
          strapi.log.info(`[cron] driver-launch-ticker → ${JSON.stringify(resumen)}`);
        }
      } catch (error) {
        strapi.log.error(`[cron] driver-launch-ticker falló (${error.message || error})`);
      }
    },
  },
};

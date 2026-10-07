'use strict';

/**
 * Endpoints públicos de la landing de descarga de conductores.
 *
 *   POST /api/driver-launch/claim           → solicita la promo (otorga token)
 *   POST /api/driver-launch/notify          → aviso de lanzamiento / reenviar / baja
 *   GET  /api/driver-launch/download/:token → entrega el APK y aplica la promo
 *
 * Claves de diseño:
 *  - Turnstile en los POST; el GET de descarga se protege con token criptográfico;
 *  - la promoción NO se otorga al abrir la landing, sólo al hacer claim y, de
 *    forma definitiva, al descargar con token válido;
 *  - `promo_expires_at` es una columna del `driver`, no del lead: los meses
 *    promocionales corren desde el inicio de la membresía real, no desde la
 *    descarga, así que aquí nunca se escribe;
 *  - nunca se guardan IPs: el rate limit usa un hash de la clave.
 */

const fs = require('node:fs');
const crypto = require('node:crypto');

const { verificarTurnstile } = require('../utils/turnstile');
const { buscarApk, nombreArchivo } = require('../utils/apk');
const { normalizarEmail, generarToken, tokenCoincide, normalizarAtribucion, normalizarConsentimiento } = require('../utils/validaciones');
const { enviarCorreoDescarga } = require('../services/brevo');
const promo = require('../services/promo');

const LEAD = 'api::driver-launch-lead.driver-launch-lead';
const VENTANA_MS = 10 * 60 * 1000;
const MAX_POR_CLAVE = 40;
const MIME_APK = 'application/vnd.android.package-archive';

/* Rate limit en memoria: freno de mano, no sustituye a Turnerstile ni a Nginx. */
const contadores = new Map();

function registrar(clave) {
  const ahora = Date.now();
  const actual = contadores.get(clave);
  if (!actual || actual.expira <= ahora) {
    const nuevo = { total: 1, expira: ahora + VENTANA_MS };
    contadores.set(clave, nuevo);
    return nuevo;
  }
  actual.total += 1;
  return actual;
}

const hash = valor => crypto.createHash('sha256').update(String(valor)).digest('hex').slice(0, 16);
const claveIp = ctx => `ip:${hash(ctx && ctx.ip ? ctx.ip : 'desconocida')}`;

const temporizador = setInterval(() => {
  const ahora = Date.now();
  for (const [clave, valor] of contadores) if (valor.expira <= ahora) contadores.delete(clave);
}, VENTANA_MS);
if (temporizador.unref) temporizador.unref();

const configSvc = () => strapi.service('api::driver-membership-config.driver-membership-config');
const leads = () => strapi.db.query(LEAD);

/**
 * Origen desde el que se sirve el endpoint de descarga. Puede ser distinto al
 * del frontend (y al de la API interna), por eso es una variable propia.
 */
const baseDescarga = () =>
  (process.env.DRIVER_DOWNLOAD_BASE_URL || process.env.PUBLIC_FRONTEND_URL || 'https://api.ciudadan.org').replace(/\/$/, '');

/** Si no pasa la verificación, lanza el error HTTP correspondiente. */
async function exigirTurnstile(ctx, body) {
  const resultado = await verificarTurnstile(body.turnstileToken, { strapi });
  if (resultado.ok) return true;
  if (resultado.codigo === 503) {
    return ctx.throw(503, 'El servicio de verificación no está disponible. Intenta de nuevo en unos minutos.');
  }
  return ctx.throw(400, 'No pudimos verificar que eres humano. Intenta de nuevo.');
}

module.exports = {
  /**
   * POST /api/driver-launch/claim
   * body: { email, quieroAviso, emailConsent, privacyVersion, turnstileToken, utm* }
   */
  async claim(ctx) {
    const body = ctx.request.body || {};
    await exigirTurnstile(ctx, body);

    const email = normalizarEmail(body.email);
    if (!email) return ctx.badRequest('Ingresa un correo válido para continuar.');

    const clave = `${claveIp(ctx)}:${hash(email)}`;
    if (registrar(clave).total > MAX_POR_CLAVE) {
      return ctx.tooManyRequests('Has hecho muchas solicitudes. Espera unos minutos.');
    }

    const config = await configSvc().getConfig();
    const estado = await configSvc().estadoPromocion();
    const deseaAviso = body.quieroAviso === true || body.wantsLaunchEmail === true;
    const cambios = { ...normalizarAtribucion(body), ...normalizarConsentimiento(body) };
    if (deseaAviso) cambios.wants_launch_email = true;

    let lead = await leads().findOne({ where: { email } });
    const yaReclamado = Boolean(lead && lead.promo_claimed === true);
    let token = lead && lead.claim_token ? lead.claim_token : null;
    let concedida = false;

    // El token SIEMPRE se entrega (aunque la promoción haya terminado): es el
    // control de abuso de la descarga. La promoción es lo que se niega.
    if (estado.permitido && !yaReclamado) {
      concedida = true;
      cambios.promo_claimed = true;
      cambios.promo_source = 'prelaunch_download';
      cambios.download_requested_at = new Date().toISOString();
      // La caducidad vive en driver.promo_expires_at (el lead no tiene esa
      // columna): aquí sólo se registra la elegibilidad.
    } else if (!lead) {
      cambios.promo_claimed = false;
    }
    if (!token) token = generarToken();
    cambios.claim_token = token;

    try {
      lead = lead
        ? await leads().update({ where: { id: lead.id }, data: cambios })
        : await leads().create({ data: { email, ...cambios } });
    } catch (error) {
      // Dos claims simultáneos del mismo email: se reintentan sobre el existente.
      if (!/unique|duplicate|exist/i.test(String(error && error.message))) throw error;
      lead = await leads().findOne({ where: { email } });
      if (!lead) return ctx.throw(500, 'No pudimos registrar tu solicitud. Intenta de nuevo.');
    }

    if (concedida) {
      try {
        await promo.grantPendingPromoByEmail(email);
      } catch (error) {
        strapi.log.error(`[driver-launch] No se pudo vincular la promo de ${hash(email)} (${error.message || error})`);
      }
    }

    const enlace = `${baseDescarga()}/api/driver-launch/download/${token}`;
    const promoTexto = `$${config.promotional_monthly_price} ${config.currency}/mes por ${config.promotion_duration_months} meses`;
    const correo = await enviarCorreoDescarga({ email, downloadUrl: enlace, promoText: promoTexto });

    const message = concedida
      ? `¡Listo! Tu membresía queda en ${promoTexto}. Descarga la app desde tu enlace (también te lo enviamos al correo).`
      : yaReclamado
        ? 'Tu acceso ya estaba activo: te enviamos de nuevo tu enlace de descarga al correo.'
        : 'La promoción ya no está disponible, pero aquí tienes tu enlace para descargar la app y registrarte al precio ordinario.';

    ctx.body = {
      data: {
        promocionConcedida: concedida,
        promoExpiresAt: null,
        regularMonthlyPrice: config.regular_monthly_price,
        promotionalMonthlyPrice: config.promotional_monthly_price,
        currency: config.currency,
        promotionDurationMonths: config.promotion_duration_months,
        downloadToken: token,
        downloadUrl: enlace,
        emailEnviado: correo.ok,
        emailError: correo.ok ? null : correo.error,
        promotionDeadline: config.promotion_claim_deadline,
        launchAt: config.launch_at,
        message,
      },
    };
  },

  /**
   * POST /api/driver-launch/notify
   * body: { accion: 'aviso'|'resend_link'|'unsubscribe', email, emailConsent?, turnstileToken }
   */
  async notify(ctx) {
    const body = ctx.request.body || {};
    await exigirTurnstile(ctx, body);

    const accion = String(body.accion || '').trim();
    if (!['aviso', 'resend_link', 'unsubscribe'].includes(accion)) {
      return ctx.badRequest('Acción no reconocida.');
    }

    const email = normalizarEmail(body.email);
    if (!email) return ctx.badRequest('Ingresa un correo válido.');

    const clave = `notify:${claveIp(ctx)}:${hash(email)}`;
    if (registrar(clave).total > MAX_POR_CLAVE) {
      return ctx.tooManyRequests('Has hecho muchas solicitudes. Espera unos minutos.');
    }

    const frontendUrl = (process.env.PUBLIC_FRONTEND_URL || 'https://ciudadan.org').replace(/\/$/, '');
    let lead = await leads().findOne({ where: { email } });

    if (accion === 'unsubscribe') {
      if (lead) await leads().update({ where: { id: lead.id }, data: { wants_launch_email: false } });
      ctx.body = { data: { message: 'Te avisaremos por WhatsApp cuando llegue el momento.' } };
      return;
    }

    if (accion === 'aviso') {
      const consentimiento = normalizarConsentimiento(body);
      if (!consentimiento.email_consent) {
        return ctx.badRequest('Necesitamos tu confirmación explícita para enviarte un correo.');
      }
      const datos = { wants_launch_email: true, ...consentimiento };
      lead = lead
        ? await leads().update({ where: { id: lead.id }, data: datos })
        : await leads().create({ data: { email, ...datos, wants_launch_email: true } });
      ctx.body = { data: { message: '¡Perfecto! Te escribiremos por correo el día del lanzamiento.' } };
      return;
    }

    // accion === 'resend_link': rota el token para invalidar enlaces previos.
    if (!lead || lead.promo_claimed !== true) {
      return ctx.badRequest('No encontramos un acceso pendiente para ese correo. Solicita la promoción de nuevo.');
    }
    const token = generarToken();
    await leads().update({ where: { id: lead.id }, data: { claim_token: token } });
    const config = await configSvc().getConfig();
    const enlace = `${baseDescarga()}/api/driver-launch/download/${token}`;
    const correo = await enviarCorreoDescarga({
      email,
      downloadUrl: enlace,
      promoText: `$${config.promotional_monthly_price} ${config.currency}/mes por ${config.promotion_duration_months} meses`,
    });
    if (!correo.ok) {
      strapi.log.error(`[driver-launch] No se pudo reenviar el enlace a ${hash(email)} (${correo.error})`);
      ctx.body = { data: { message: 'Aún no podemos enviarte el correo. Aquí tienes tu enlace:', downloadUrl: enlace, emailEnviado: false } };
      return;
    }
    ctx.body = { data: { message: 'Te enviamos un enlace nuevo a tu correo.', downloadUrl: enlace, emailEnviado: true } };
  },

  /**
   * GET /api/driver-launch/download/:token
   * Entrega el APK y es el momento en que la promoción queda aplicada.
   */
  async download(ctx) {
    const token = ctx.params.token;
    if (typeof token !== 'string' || token.length < 16 || token.length > 128) {
      return ctx.badRequest('Enlace de descarga no válido.');
    }

    const lead = await leads().findOne({ where: { claim_token: token } });
    if (!lead || !lead.claim_token || !tokenCoincide(token, lead.claim_token)) {
      strapi.log.warn(`[driver-launch] Descarga con token inválido o caducado desde ${claveIp(ctx)}`);
      return ctx.notFound('Este enlace de descarga ya no es válido. Solicita uno nuevo.');
    }

    // La promoción se aplica al descargar (idempotente): un fallo aquí no
    // puede impedir que la persona descargue la app.
    try {
      await promo.aplicarPromoEnDescarga(lead.id);
    } catch (error) {
      strapi.log.error(`[driver-launch] Promo no aplicada en lead ${lead.id} (${error.message || error})`);
    }

    if (!lead.downloaded_at) {
      try {
        await leads().update({
          where: { id: lead.id },
          data: {
            downloaded_at: new Date().toISOString(),
            promo_claimed: true,
            promo_source: lead.promo_source || 'prelaunch_download',
          },
        });
      } catch (error) {
        strapi.log.error(`[driver-launch] No se pudo marcar la descarga del lead ${lead.id} (${error.message || error})`);
      }
    }

    if (registrar(claveIp(ctx)).total > MAX_POR_CLAVE) {
      return ctx.tooManyRequests('Has hecho muchas descargas. Espera unos minutos.');
    }

    const apk = buscarApk();
    if (!apk) {
      strapi.log.error('[driver-launch] No hay APK publicado (scripts/sync-apk.js). Descarga no disponible.');
      return ctx.serviceUnavailable('La aplicación aún no está disponible para descarga. Intenta de nuevo en unos minutos.');
    }

    const config = await configSvc().getConfig();
    ctx.set('Content-Type', MIME_APK);
    ctx.set('Content-Disposition', `attachment; filename="${nombreArchivo(config.apk_version)}"`);
    ctx.set('Content-Length', String(apk.tamano));
    ctx.set('Cache-Control', 'no-store');
    ctx.set('X-Content-Type-Options', 'nosniff');
    strapi.log.info(`[driver-launch] Descarga iniciada por lead ${lead.id} (${(apk.tamano / 1048576).toFixed(1)} MB)`);

    const stream = fs.createReadStream(apk.ruta);
    stream.on('error', error => {
      strapi.log.error(`[driver-launch] Fallo al enviar el APK del lead ${lead.id} (${error.message || error})`);
    });
    ctx.body = stream;
  },
};




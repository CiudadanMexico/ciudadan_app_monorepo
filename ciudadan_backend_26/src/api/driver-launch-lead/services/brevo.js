'use strict';

/**
 * Envío de correos de lanzamiento vía Brevo (API HTTP v3, sin SDK).
 *
 * Variables:
 *   BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME,
 *   BREVO_LAUNCH_TEMPLATE_ID, PUBLIC_FRONTEND_URL
 *
 * Nunca se lanza: los errores se devuelven para que el cron los registre.
 * El API key jamás debe terminar en el frontend (ni en REACT_APP_*).
 */

const axios = require('axios');

const ENDPOINT = 'https://api.brevo.com/v3/smtp/email';
const escapeHtml = valor =>
  String(valor == null ? '' : valor).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const config = () => ({
  apiKey: process.env.BREVO_API_KEY || '',
  senderEmail: process.env.BREVO_SENDER_EMAIL || '',
  senderName: process.env.BREVO_SENDER_NAME || 'Ciudadan',
  templateId: process.env.BREVO_LAUNCH_TEMPLATE_ID || '',
  transactionalTemplateId: process.env.BREVO_TRANSACTIONAL_TEMPLATE_ID || '',
  frontendUrl: (process.env.PUBLIC_FRONTEND_URL || 'https://ciudadan.org').replace(/\/$/, ''),
});

const asunto = 'Ciudadan ya está aquí 🚕';

/** HTML de respaldo para desarrollo/pruebas cuando no hay template en Brevo. */
function htmlLanzamiento({ launchDate, downloadUrl, frontendUrl }) {
  const fecha = escapeHtml(launchDate || 'hoy');
  const descarga = escapeHtml(downloadUrl || `${frontendUrl}/descargar`);
  return `<!doctype html><html lang="es"><body style="margin:0;background:#11172b;font-family:Inter,Segoe UI,Arial,sans-serif;color:#11172b">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#11172b;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;padding:28px">
        <tr><td style="font-size:13px;letter-spacing:.14em;color:#6940c9;font-weight:700">GRAN LANZAMIENTO CIUDADAN</td></tr>
        <tr><td style="font-size:26px;font-weight:800;padding-top:10px">Ciudadan ya está aquí 🚕</td></tr>
        <tr><td style="padding-top:6px;color:#566076">La app ya está disponible desde el <b>${fecha}</b>.</td></tr>
        <tr><td style="padding-top:10px;color:#566076">Descárgala, regístrate como conductor y conserva el <b>100% del pago de tus viajes</b>. Si obtuviste tu precio promocional, quedará asociado a tu cuenta automáticamente.</td></tr>
        <tr><td style="padding:26px 0"><a href="${descarga}" style="background:#efe92f;color:#11172b;font-weight:800;text-decoration:none;padding:14px 22px;border-radius:8px;display:inline-block">DESCARGAR CIUDADAN</a></td></tr>
        <tr><td style="color:#566076;font-size:13px">¿No te llega el enlace? Entra directamente a <a href="${escapeHtml(frontendUrl)}/descargar">${escapeHtml(frontendUrl)}/descargar</a>.</td></tr>
        <tr><td style="padding-top:22px;color:#566076;font-size:12px">Ciudadan · tecnología cooperativa para construir una economía más justa.</td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

/**
 * @param {{email: string, launchDate?: string, downloadUrl?: string, params?: object}} opts
 * @returns {Promise<{ok: boolean, messageId?: string, error?: string}>}
 */
async function enviarCorreoLanzamiento({ email, launchDate, downloadUrl, params } = {}) {
  const c = config();
  if (!c.apiKey) return { ok: false, error: 'BREVO_API_KEY no está configurada' };
  if (!email) return { ok: false, error: 'Destinatario vacío' };
  if (!c.senderEmail) return { ok: false, error: 'BREVO_SENDER_EMAIL no está configurada' };

  const url = downloadUrl || `${c.frontendUrl}/descargar`;
  const body = c.templateId
    ? {
        sender: { name: c.senderName, email: c.senderEmail },
        to: [{ email }],
        templateId: Number(c.templateId),
        params: params || { launchDate: launchDate || '', downloadUrl: url },
      }
    : {
        sender: { name: c.senderName, email: c.senderEmail },
        to: [{ email }],
        subject: asunto,
        htmlContent: htmlLanzamiento({ launchDate, downloadUrl: url, frontendUrl: c.frontendUrl }),
      };

  try {
    const res = await axios.post(ENDPOINT, body, {
      timeout: 15000,
      headers: { 'api-key': c.apiKey, 'content-type': 'application/json', accept: 'application/json' },
    });
    return { ok: true, messageId: res.data?.messageId || '' };
  } catch (error) {
    const detalle = error.response?.data?.message || error.response?.status || error.message || 'error desconocido';
    return { ok: false, error: String(detalle).slice(0, 500) };
  }
}

/**
 * Correo con el enlace personal de descarga (se dispara al obtener la promo
 * o al pedir "reenviar enlace"). Requiere BREVO_TRANSACTIONAL_TEMPLATE_ID;
 * sin plantilla no se inventa un segundo email: se responde 502 y la UI
 * muestra el enlace en pantalla.
 */
async function enviarCorreoDescarga({ email, downloadUrl, promoText } = {}) {
  const c = config();
  if (!c.apiKey) return { ok: false, error: 'BREVO_API_KEY no está configurada' };
  if (!c.transactionalTemplateId) return { ok: false, error: 'BREVO_TRANSACTIONAL_TEMPLATE_ID no está configurada' };
  if (!email || !c.senderEmail) return { ok: false, error: 'Faltan destinatario o remitente' };

  try {
    const res = await axios.post(
      ENDPOINT,
      {
        sender: { name: c.senderName, email: c.senderEmail },
        to: [{ email }],
        templateId: Number(c.transactionalTemplateId),
        params: {
          downloadUrl: downloadUrl || '',
          promoText: promoText || '',
          frontendUrl: c.frontendUrl,
        },
      },
      { timeout: 15000, headers: { 'api-key': c.apiKey, 'content-type': 'application/json', accept: 'application/json' } },
    );
    return { ok: true, messageId: res.data?.messageId || '' };
  } catch (error) {
    const detalle = error.response?.data?.message || error.response?.status || error.message || 'error desconocido';
    return { ok: false, error: String(detalle).slice(0, 500) };
  }
}

module.exports = { enviarCorreoLanzamiento, enviarCorreoDescarga, htmlLanzamiento, asunto };


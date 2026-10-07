import { fetchJson, STRAPI_URL } from '../utils/request.utils';

/**
 * Servicios de la landing de descarga de conductores.
 *
 * Reglas que comparte con el backend:
 *  - los precios SIEMPRE vienen de `/api/driver-membership/public-config`
 *    (nunca se hardcodean ni se envían al crear el lead);
 *  - el enlace de descarga lo decide el servidor (`downloadUrl`);
 *  - si la API no responde, la página no se rompe: se usan precios de
 *    referencia y se avisa al usuario.
 */

export const MEMBERSHIP_CONFIG_URL = `${STRAPI_URL}/api/driver-membership/public-config`;
const LAUNCH_URL = `${STRAPI_URL}/api/driver-launch`;

/** Versión del aviso de privacidad que se acepta desde esta landing. */
export const PRIVACY_VERSION = 'conductor-launch-2026-09';

/** Precios de referencia (los mismos defaults del Single Type). */
export const CONFIG_PREDEFINIDA = Object.freeze({
  regularMonthlyPrice: 500,
  promotionalMonthlyPrice: 300,
  currency: 'MXN',
  promotionDurationMonths: 12,
  promotionActive: true,
  promotionClaimDeadline: null,
  launchAt: null,
  launchTitle: 'Gran lanzamiento Ciudadan',
  apk: { disponible: false, version: null, tamanoMb: null },
});

const numero = (valor, respaldo) => {
  const parseado = typeof valor === 'number' ? valor : parseFloat(valor);
  return Number.isFinite(parseado) ? parseado : respaldo;
};

const fecha = valor => {
  if (!valor) return null;
  const ms = Date.parse(valor);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
};

const normalizarApk = (bruto = {}) => {
  const origen = bruto || {};
  const tamano = origen.tamanoMb ?? origen.tamano_mb;
  return {
    disponible: origen.disponible === true || origen.disponible === 'true',
    version: origen.version ? String(origen.version).slice(0, 60) : null,
    tamanoMb: Number.isFinite(numero(tamano, NaN)) && numero(tamano, 0) > 0 ? numero(tamano, 0) : null,
  };
};

/** Acepta el payload camelCase actual y el snake_case interno del Single Type. */
export function normalizarConfig(bruto = {}) {
  const origen = bruto || {};
  const lectura = (...claves) => {
    for (const clave of claves) {
      if (origen[clave] !== undefined && origen[clave] !== null) return origen[clave];
    }
    return undefined;
  };
  return {
    regularMonthlyPrice: numero(lectura('regularMonthlyPrice', 'regular_monthly_price'), CONFIG_PREDEFINIDA.regularMonthlyPrice),
    promotionalMonthlyPrice: numero(lectura('promotionalMonthlyPrice', 'promotional_monthly_price'), CONFIG_PREDEFINIDA.promotionalMonthlyPrice),
    currency: String(lectura('currency') || CONFIG_PREDEFINIDA.currency).slice(0, 8).toUpperCase(),
    promotionDurationMonths: numero(lectura('promotionDurationMonths', 'promotion_duration_months'), CONFIG_PREDEFINIDA.promotionDurationMonths),
    promotionActive: lectura('promotionActive', 'promotion_active') === undefined
      ? CONFIG_PREDEFINIDA.promotionActive
      : lectura('promotionActive', 'promotion_active') === true || lectura('promotionActive', 'promotion_active') === 'true',
    promotionClaimDeadline: fecha(lectura('promotionClaimDeadline', 'promotion_claim_deadline')),
    launchAt: fecha(lectura('launchAt', 'launch_at')),
    launchTitle: String(lectura('launchTitle', 'launch_title') || CONFIG_PREDEFINIDA.launchTitle).slice(0, 160),
    apk: normalizarApk(lectura('apk') || {}),
  };
}

/** Configuración pública de la membresía. Nunca lanza: devuelve defaults. */
export async function getMembershipConfig() {
  try {
    const response = await fetch(MEMBERSHIP_CONFIG_URL, { method: 'GET', headers: { Accept: 'application/json' } });
    if (!response.ok) return { ...CONFIG_PREDEFINIDA, esRespaldo: true };
    const payload = await response.json();
    const raw = payload && typeof payload === 'object' && payload.data && !Array.isArray(payload.data) ? payload.data : payload;
    if (!raw || typeof raw !== 'object') return { ...CONFIG_PREDEFINIDA, esRespaldo: true };
    return { ...normalizarConfig(raw), esRespaldo: false };
  } catch {
    return { ...CONFIG_PREDEFINIDA, esRespaldo: true };
  }
}

const postLaunch = async (ruta, cuerpo, mensaje) => {
  const respaldo = {
    ok: false,
    status: 0,
    message: mensaje,
    downloadUrl: null,
    downloadToken: null,
    promocionConcedida: false,
    emailEnviado: true,
    data: {},
  };

  let payload;
  try {
    payload = await fetchJson(
      `${LAUNCH_URL}/${ruta}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(cuerpo),
      },
      mensaje,
    );
  } catch (falla) {
    // fetchJson lanza con el mensaje en español del backend; si la caída es de
    // red el mensaje viene en inglés, así que se sustituye por el nuestro.
    const texto = (falla && falla.message) || '';
    const esRed = /failed to fetch|networkerror|load failed|network request failed/i.test(texto);
    return { ...respaldo, message: esRed ? mensaje : texto || mensaje };
  }

  const datos = payload && payload.data ? payload.data : (payload || {});
  return {
    ok: true,
    status: 200,
    message: datos.message || 'Listo.',
    downloadUrl: datos.downloadUrl || datos.descargaUrl || null,
    downloadToken: datos.downloadToken || null,
    promocionConcedida: datos.promocionConcedida === true,
    emailEnviado: datos.emailEnviado !== false,
    data: datos,
  };
};

/** POST /api/driver-launch/claim — entrega el enlace de descarga. */
export const reclamarDescarga = (cuerpo, mensaje = 'No pudimos generar tu enlace. Revisa tu correo e intenta de nuevo.') =>
  postLaunch('claim', cuerpo, mensaje);

/** POST /api/driver-launch/notify — aviso de lanzamiento, reenvío o baja. */
export const notificar = (cuerpo, mensaje = 'No pudimos registrar tu solicitud. Intenta de nuevo.') =>
  postLaunch('notify', cuerpo, mensaje);

export const reenviarEnlace = (email, turnstileToken = '') =>
  notificar({ accion: 'resend_link', email, turnstileToken }, 'No pudimos reenviar el enlace. Intenta de nuevo.');

export const suscribirAviso = (email, turnstileToken = '') =>
  notificar({
    accion: 'aviso',
    email,
    emailConsent: true,
    privacyVersion: PRIVACY_VERSION,
    turnstileToken,
  }, 'No pudimos guardar tu aviso de lanzamiento. Intenta de nuevo.');

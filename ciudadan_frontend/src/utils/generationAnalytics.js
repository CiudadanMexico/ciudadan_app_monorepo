/**
 * Analytics + tracking de campaña — Generación Fundadora 2026
 * ------------------------------------------------------------------
 * Usa la infraestructura existente: si el entorno define window.dataLayer
 * (GTM) o window.gtag, los eventos fluyen ahí; en desarrollo se registran
 * en consola. No inicializa proveedores nuevos (spec 14 y 26).
 *
 * Tracking UTM (spec 13): via, utm_source, utm_medium, utm_campaign,
 * utm_content y referrer se capturan de la URL y persisten en
 * sessionStorage para que sobrevivan la navegación hasta el registro.
 */
import { GENERATION_ANALYTICS_EVENTS } from '../config/generationFounderConfig';

const STORAGE_KEY = 'ciudadan_generation_tracking';

const TRACKING_KEYS = [
  'via',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
];

/**
 * Captura los parámetros de tracking de la URL actual (si existen)
 * y los persiste en sessionStorage sin sobrescribir valores previos
 * de otra campaña más reciente.
 */
export const captureTrackingParams = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const captured = {};
    TRACKING_KEYS.forEach((key) => {
      const value = params.get(key);
      if (value) captured[key] = value;
    });

    if (Object.keys(captured).length === 0) return readTrackingParams();

    const current = readTrackingParams();
    const merged = { ...current, ...captured, referrer: current.referrer || document.referrer || '' };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return {};
  }
};

/** Lee los parámetros de tracking persistidos (con via opcional de respaldo). */
export const readTrackingParams = (fallbackVia) => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const stored = raw ? JSON.parse(raw) : {};
    if (fallbackVia) stored.via = stored.via || fallbackVia;
    return stored;
  } catch {
    return fallbackVia ? { via: fallbackVia } : {};
  }
};

/** Limpia el tracking tras enviar el registro. */
export const clearTrackingParams = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
};

/**
 * Emite un evento del módulo con metadata estándar
 * (via / source / campaign tomados del tracking persistido).
 */
export const trackGenerationEvent = (eventName, metadata = {}) => {
  const tracking = readTrackingParams();
  const payload = {
    event: eventName,
    via: metadata.via || tracking.via || null,
    source: metadata.source || tracking.utm_source || null,
    campaign: metadata.campaign || tracking.utm_campaign || null,
    ...metadata,
  };

  try {
    if (typeof window !== 'undefined') {
      if (Array.isArray(window.dataLayer)) {
        window.dataLayer.push(payload);
      }
      if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, payload);
      }
    }
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('[generation-analytics]', eventName, payload);
    }
  } catch {
    /* el tracking nunca debe romper la UI */
  }
};

export const generationEvents = GENERATION_ANALYTICS_EVENTS;

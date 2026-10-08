// src/utils/normalizeNotification.js
//
// Normalizador ÚNICO de notificaciones.
//
// El modelo de Strapi, el payload del socket y los datos históricos usan
// propiedades distintas (titulo/title, mensaje/message/cuerpo, leida/read,
// timestamp/createdAt, icono/icon, imagen/image). Todo lo que consuma
// notificaciones debe pasar por aquí para que la UI reciba SIEMPRE:
//
//   { id, title, message, type, link, icon, image, read, createdAt, meta }

import { STRAPI_URL } from './request.utils';

const STRAPI_BASE = (STRAPI_URL || '').replace(/\/$/, '');

const asString = (value) => (value === null || value === undefined ? '' : String(value));

/** `cuerpo` es de tipo `blocks` de Strapi; lo convertimos a texto plano. */
export function blocksToPlainText(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;

  if (Array.isArray(value)) {
    return value
      .map((block) => {
        if (typeof block === 'string') return block;
        const children = block?.children;
        if (Array.isArray(children)) {
          return children.map((child) => child?.text ?? child?.children?.map((c) => c?.text).join('') ?? '').join('');
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  if (typeof value === 'object' && Array.isArray(value.children)) {
    return value.children
      .map((child) => child?.text ?? '')
      .join('');
  }

  return '';
}

/** Resuelve la media de Strapi (objeto o lista) a una URL absoluta. */
function resolveMediaUrl(media) {
  if (!media) return null;
  if (typeof media === 'string') return media;

  const entry = Array.isArray(media) ? media[0] : media;
  if (!entry || typeof entry !== 'object') return null;

  const raw = entry.url || entry.formats?.thumbnail?.url || entry.formats?.small?.url || null;
  if (!raw) return null;

  return /^https?:\/\//i.test(raw) ? raw : `${STRAPI_BASE}${raw}`;
}

function isRead(attrs) {
  if (attrs?.read !== undefined && attrs?.read !== null) return Boolean(attrs.read);
  if (attrs?.leida !== undefined && attrs?.leida !== null) {
    return attrs.leida === true || attrs.leida === 'true';
  }
  return asString(attrs?.status).toLowerCase() === 'leida';
}

/** Primer valor definido (evita el lío de precedencia entre ?? y ternarios). */
const firstDefined = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
};

export function normalizeNotification(raw) {
  if (!raw) return null;

  // Strapi REST: { id, attributes } · entityService: plano · socket: lo mismo.
  const attrs = raw.attributes ?? raw;
  const id = raw.id ?? attrs.id ?? null;
  if (id === null || id === undefined) return null;

  const message = asString(attrs.message ?? attrs.mensaje).trim() || blocksToPlainText(attrs.cuerpo).trim();
  const rawTitle = asString(attrs.title ?? attrs.titulo).trim();
  const firstLine = message.split('\n')[0].trim();

  const title = rawTitle || (firstLine ? firstLine.slice(0, 140) : '') || 'Notificación';

  const meta =
    attrs.meta && typeof attrs.meta === 'object' && !Array.isArray(attrs.meta) ? attrs.meta : null;

  return {
    id,
    title,
    message,
    type: attrs.type ?? attrs.tipo ?? null,
    link: attrs.link ?? attrs.url ?? attrs.href ?? null,
    icon: attrs.icon ?? attrs.icono ?? null,
    // La media real manda; si no hay, `meta.image` (URL externa guardada por
    // el backend al hacer send()).
    image: resolveMediaUrl(attrs.imagen ?? attrs.image) || meta?.image || null,
    read: isRead(attrs),
    createdAt: firstDefined(attrs.createdAt, attrs.created_at, attrs.timestamp),
    meta,
  };
}

/** Normaliza una lista de notificaciones descartando las inválidas. */
export function normalizeNotifications(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeNotification).filter(Boolean);
}

export default normalizeNotification;

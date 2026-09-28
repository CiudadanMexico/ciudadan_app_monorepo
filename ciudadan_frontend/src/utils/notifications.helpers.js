// src/utils/notifications.helpers.js
//
// Funciones puras de estado para notificaciones. Sin React aquí (sólo datos).

/**
 * Inserta o actualiza una notificación dentro de la lista, evitando duplicados.
 *
 * Caso real (Caso 6 del plan de pruebas): la notificación llega por socket y
 * unos segundos después llega otra vez en un `refresh()`. Como la clave es el
 * `id`, no aparece dos veces; si ya existía, se sustituye por la versión nueva.
 */
export function upsertNotification(list, notification) {
  const current = Array.isArray(list) ? list : [];

  if (!notification || notification.id === null || notification.id === undefined) {
    return current;
  }

  const index = current.findIndex((n) => String(n?.id) === String(notification.id));

  if (index === -1) {
    // Lo nuevo arriba (la lista viene ordenada por fecha descendente).
    return [notification, ...current];
  }

  const next = [...current];
  // La versión más reciente gana.
  next[index] = { ...next[index], ...notification };
  return next;
}

/** Marca como leída una notificación concreta (optimista, sin tocar el resto). */
export function markNotificationReadInList(list, id, read = true) {
  if (!Array.isArray(list)) return [];
  return list.map((n) =>
    String(n?.id) === String(id) ? { ...n, read: Boolean(read) } : n
  );
}

/** Total de no leídas: la fuente de verdad es la propia lista (sin contadores extra). */
export function countUnread(list) {
  if (!Array.isArray(list)) return 0;
  return list.filter((n) => !n?.read).length;
}

/**
 * Validación sencilla de `send()` — sin librerías (§21 del plan).
 * Lanza un Error con un mensaje claro si falta lo mínimo.
 */
export function validateSendPayload(payload = {}) {
  const to = typeof payload.to === 'string' ? payload.to.trim() : '';
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const message = typeof payload.message === 'string' ? payload.message.trim() : '';

  if (!to) {
    throw new Error('send(): falta "to" (email del destinatario)');
  }
  if (!title && !message) {
    throw new Error('send(): se requiere "title" o "message"');
  }

  return { to, title, message, type: payload.type, link: payload.link, icon: payload.icon, image: payload.image, meta: payload.meta };
}

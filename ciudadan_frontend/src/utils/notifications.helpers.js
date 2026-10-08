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

// ---------------------------------------------------------------------------
// Anuncio por toast de una llegada (docs/NOTIFICACIONES.md §15)
//
// Regla de producto: UNA notificación = UN toast. El problema que resuelve
// esto es el autoenvío (el tester, o cualquier `send({ to: miEmail })`): la
// pestaña emisora recibe por socket lo mismo que acaba de crear y acababa de
// mostrar ya el toast de la acción -> dos toasts del mismo evento.
//
// Señales, de más a menos precisa:
//   1) `meta.clientOrigin` == id de esta pestaña  -> determinista (el backend
//      guarda `meta` y emite por socket EXACTAMENTE la misma forma que devuelve
//      en el POST, así que el marcador sobrevive el viaje).
//   2) hay un send() en vuelo -> el eco puede llegar ANTES que la respuesta HTTP
//      (el backend emite por socket antes de responder).
//   3) el id ya fue anotado por send() y sigue en ventana -> el eco llegó
//      DESPUÉS de la respuesta.
//   4) la notificación ya estaba en la lista -> reentrega (refresh, reconnect).
// ---------------------------------------------------------------------------

/** Clave dentro de `meta` que marca qué pestaña originó el `send()`. */
export const SELF_ORIGIN_KEY = 'clientOrigin';

/** Vida útil de los ids anotados por `send()` (solo es una red de seguridad). */
export const SELF_SENT_TTL_MS = 15000;

const TAB_ID_KEY = 'ciudadan_notif_tab_id';

let cachedTabId = null;

const randomId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Id estable POR PESTAÑA (no por usuario, no por dispositivo). Sobrevive a un
 * HMR/redo via sessionStorage, pero dos pestañas del mismo usuario tienen ids
 * distintos: si envías desde una pestaña, la otra SÍ debe announcear.
 */
export function getTabId() {
  if (cachedTabId) return cachedTabId;

  let value = null;
  try {
    if (typeof sessionStorage !== 'undefined') {
      value = sessionStorage.getItem(TAB_ID_KEY);
      if (!value) {
        value = randomId();
        sessionStorage.setItem(TAB_ID_KEY, value);
      }
    }
  } catch (err) {
    // Modo privado / sin storage: seguimos funcionando con un id en memoria.
    value = value || randomId();
  }

  cachedTabId = value;
  return cachedTabId;
}

/** Añade el marcador de origen al payload antes de mandarlo al backend. */
export function withSelfOrigin(payload, tabId = getTabId()) {
  if (!tabId) return payload;
  const meta =
    payload?.meta && typeof payload.meta === 'object' && !Array.isArray(payload.meta)
      ? payload.meta
      : {};
  return { ...payload, meta: { ...meta, [SELF_ORIGIN_KEY]: tabId } };
}

/** Anota que este id salió de un `send()` de esta pestaña (registry = Map). */
export function rememberSelfSent(registry, id, now = Date.now()) {
  if (!registry || typeof registry.set !== 'function') return registry;
  if (id === null || id === undefined) return registry;
  registry.set(String(id), now);
  return registry;
}

/** Tira los ids ya caducados para que el registry no crezca sin límite. */
export function pruneSelfSent(registry, now = Date.now(), ttlMs = SELF_SENT_TTL_MS) {
  if (!registry || typeof registry.entries !== 'function') return registry;
  Array.from(registry.entries()).forEach(([id, seenAt]) => {
    if (now - seenAt > ttlMs) registry.delete(id);
  });
  return registry;
}

/**
 * ¿Toca mostrar el toast de "nueva notificación"?
 *
 * @param {object}  args
 * @param {object}  args.notification notificación YA normalizada
 * @param {string}  args.tabId        id de esta pestaña (`getTabId()`)
 * @param {Array}   args.list         lista actual en memoria (antes del upsert)
 * @param {number}  args.pendingSend  envíos de esta pestaña en vuelo
 * @param {Map}     args.selfSent     ids propios -> timestamp (`rememberSelfSent`)
 * @returns {boolean} true => anunciar con un toast
 */
export function shouldAnnounce({
  notification,
  tabId = null,
  list = [],
  pendingSend = 0,
  selfSent = null,
  now = Date.now(),
  ttlMs = SELF_SENT_TTL_MS,
} = {}) {
  const id = notification?.id;
  // Sin id no hay forma de deduplicar: mejor no gritar de más.
  if (id === null || id === undefined) return false;
  const key = String(id);

  // 1) Señal determinista: esta pestaña creó esa notificación.
  const origin = notification?.meta?.[SELF_ORIGIN_KEY];
  if (tabId && origin && String(origin) === String(tabId)) return false;

  // 2) Eco de un envío propio en vuelo (llega antes que la respuesta).
  if (Number(pendingSend) > 0) return false;

  // 3) Eco de un envío propio ya respondido, dentro de la ventana.
  const seenAt = selfSent && typeof selfSent.get === 'function' ? selfSent.get(key) : undefined;
  if (typeof seenAt === 'number' && now - seenAt <= ttlMs) return false;

  // 4) Reentrega de algo que ya estaba visible.
  if (Array.isArray(list) && list.some((n) => String(n?.id) === key)) return false;

  return true;
}

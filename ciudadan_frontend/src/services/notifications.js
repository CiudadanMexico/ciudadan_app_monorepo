// src/services/notifications.js
//
// Comunicación HTTP con el backend de notificaciones. Sin estado React aquí:
// sólo llamadas. Se reutiliza `fetchJson` de utils/request.utils (cliente HTTP
// centralizado del proyecto) — no se crea otro cliente.
//
// Endpoints (todos autenticados con Bearer de Auth0, ver
// ciudadan_backend_26/src/api/notificacion/routes/01-notificacion-auth0.js):
//   GET    /api/notificaciones/mine
//   GET    /api/notificaciones/mine/:id
//   POST   /api/notificaciones/send
//   PUT    /api/notificaciones/:id/read
//   POST   /api/notificaciones/mark-all-read

import { fetchJson, STRAPI_URL } from '../utils/request.utils';

const BASE = `${STRAPI_URL}/api/notificaciones`;

const authHeaders = (token) => ({
  headers: {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
});

/** Notificaciones del usuario autenticado. */
export const fetchNotifications = (token = null, { limit = 100 } = {}) =>
  fetchJson(
    `${BASE}/mine?limit=${encodeURIComponent(limit)}`,
    authHeaders(token),
    'No se pudieron cargar las notificaciones'
  );

/** Una notificación concreta del usuario autenticado. */
export const fetchNotificationById = (id, token = null) =>
  fetchJson(
    `${BASE}/mine/${encodeURIComponent(id)}`,
    authHeaders(token),
    'No se pudo cargar la notificación'
  );

/** Crea la notificación en backend y la emite por socket a su destinatario. */
export const sendNotification = (payload, token = null) =>
  fetchJson(
    `${BASE}/send`,
    {
      ...authHeaders(token),
      method: 'POST',
      body: JSON.stringify(payload),
    },
    'No se pudo enviar la notificación'
  );

/** Marca como leída (o no leída) una notificación. Idempotente. */
export const markNotificationAsRead = (id, token = null, read = true) =>
  fetchJson(
    `${BASE}/${encodeURIComponent(id)}/read${read === false ? '?read=false' : ''}`,
    {
      ...authHeaders(token),
      method: 'PUT',
    },
    'No se pudo marcar la notificación'
  );

/** Marca como leídas TODAS las no leídas del usuario autenticado. */
export const markAllNotificationsAsRead = (token = null) =>
  fetchJson(
    `${BASE}/mark-all-read`,
    {
      ...authHeaders(token),
      method: 'POST',
    },
    'No se pudieron marcar las notificaciones como leídas'
  );

export default {
  fetchNotifications,
  fetchNotificationById,
  sendNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};

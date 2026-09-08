import { fetchJson, STRAPI_URL } from '../../utils/request.utils';

const authHeaders = (token) =>
  token ? { headers: { Authorization: `Bearer ${token}` } } : {};

/**
 * POST /ads/sesiones
 * Inicia una sesión de visualización. Body: { adIds: [] }.
 * Si adIds está vacío el backend elige aleatorios (MVP).
 * Devuelve { data: { sesionId, token, items: [...] } }.
 */
export const iniciarSesion = async (adIds = []) => {
  return fetchJson(
    `${STRAPI_URL}/api/ads/sesiones`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ adIds }),
    },
    'No se pudo iniciar la sesión de anuncios'
  );
};

/**
 * POST /ads/sesiones/:id/heartbeat
 * Body: { token, itemId, currentTime, playing, visible, focused }.
 * El backend marca cobertura + tiempo efectivo solo si playing/visible/focused.
 */
export const heartbeat = async (sesionId, sessionToken, payload) => {
  if (!sesionId || !sessionToken) return Promise.resolve({ data: { ok: true } });
  return fetchJson(
    `${STRAPI_URL}/api/ads/sesiones/${sesionId}/heartbeat`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ad-Token': sessionToken,
      },
      body: JSON.stringify({ token: sessionToken, ...payload }),
    },
    'heartbeat falló (ignorado)' // el hook hace .catch(() => {}), nunca bloquea la reproducción
    // (fetchJson no acepta valor de fallback; el hook captura el error)
  );
};

/**
 * POST /ads/sesiones/:id/anuncios/:itemId/estado
 * Máquina de estados del item (queued→playing→decision_window→committed|skipped, etc).
 */
export const cambiarEstadoItem = async (sesionId, itemId, estado, sessionToken) => {
  return fetchJson(
    `${STRAPI_URL}/api/ads/sesiones/${sesionId}/anuncios/${itemId}/estado`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ad-Token': sessionToken,
      },
      body: JSON.stringify({ token: sessionToken, estado }),
    },
    'No se pudo actualizar el estado del anuncio'
  );
};

/**
 * POST /ads/sesiones/:id/anuncios/:itemId/completar
 * Único endpoint que valida cobertura/tiempo/tope-diario y emite la recompensa.
 * Devuelve { completed, valid, reward, recompensa }.
 */
export const completarAnuncio = async (sesionId, itemId, sessionToken) => {
  alert('siii terminadoooo');
  return fetchJson(
    `${STRAPI_URL}/api/ads/sesiones/${sesionId}/anuncios/${itemId}/completar`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ad-Token': sessionToken,
      },
      body: JSON.stringify({ token: sessionToken }),
    },
    'No se pudo completar el anuncio'
  );
};

/**
 * POST /ads/sesiones/:id/refill
 * Añade anuncios aleatorios adicionales al terminar la playlist.
 */
export const refillSesion = async (sesionId, sessionToken) => {
  return fetchJson(
    `${STRAPI_URL}/api/ads/sesiones/${sesionId}/refill`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ad-Token': sessionToken,
      },
      body: JSON.stringify({ token: sessionToken }),
    },
    'No se pudieron cargar más anuncios'
  );
};

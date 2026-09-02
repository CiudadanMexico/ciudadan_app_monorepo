import { fetchJson, STRAPI_URL } from '../../utils/request.utils';

const authHeaders = (token) => (token ? { headers: { Authorization: `Bearer ${token}` } } : {});

/**
 * GET /ads/publicitarios
 * Lista los anuncios publicitarios activos (video) para el grid.
 * Devuelve { data: [...] } con populate de archivo (video) + thumbnail.
 */
export const getAdsPublicitarios = (token = null) =>
  fetchJson(
    `${STRAPI_URL}/api/ads/publicitarios`,
    authHeaders(token),
    'No se pudieron cargar los anuncios disponibles'
  );

/**
 * GET /ads/sesiones/:id
 * Estado completo de la sesión (items con anuncio + estado + cobertura).
 * El token de sesión se envía en header X-Ad-Token.
 */
export const getSesion = (sesionId, sessionToken, authToken = null) => {
  if (!sesionId || !sessionToken) return Promise.resolve({ data: null });
  return fetchJson(
    `${STRAPI_URL}/api/ads/sesiones/${sesionId}`,
    {
      ...authHeaders(authToken),
      headers: {
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        'X-Ad-Token': sessionToken,
      },
    },
    'No se pudo cargar el estado de la sesión'
  );
};

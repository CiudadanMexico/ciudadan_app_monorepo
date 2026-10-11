// src/services/favoritosService.js
//
// Comunicación HTTP con el backend de favoritos. Sin estado React aquí:
// sólo llamadas. Se usa `fetchJson` (cliente HTTP centralizado del proyecto).
//
// Endpoints (todos autenticados con Bearer de Auth0, ver
// ciudadan_backend_26/src/api/favorito/routes/01-favorito-auth0.js):
//   GET    /api/favoritos/mine?tipo=&limit=
//   GET    /api/favoritos/check?tipo=&elementoId=
//   POST   /api/favoritos/toggle  { tipo, elementoId, url }
//   DELETE /api/favoritos/:id
//
// Las funciones legacy (esFavorito/toggleFavorito/agregarFavorito/
// eliminarFavorito/getFavoritosUsuario) se conservan con la MISMA firma para
// no romper DetalleProducto/ProductoCard: ahora reciben `token` (Auth0) y
// hablan con los endpoints autenticados en vez de las rutas core sin auth
// (que devolvían 401 "Missing or invalid credentials").

import { fetchJson, STRAPI_URL } from '../utils/request.utils';

const BASE = `${STRAPI_URL}/api/favoritos`;

const authHeaders = (token) => ({
  headers: {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
});

/** Favoritos del usuario autenticado. */
export const fetchFavoritos = (token = null, { tipo, limit = 100 } = {}) => {
  const params = new URLSearchParams();
  if (tipo) params.set('tipo', tipo);
  if (limit) params.set('limit', String(limit));
  const qs = params.toString() ? `?${params.toString()}` : '';
  return fetchJson(`${BASE}/mine${qs}`, authHeaders(token), 'No se pudieron cargar los favoritos');
};

/**
 * Verifica si un elemento ya está marcado como favorito.
 *
 * Retorna: { favorito: true|false, favoritoId: number|null }
 */
export async function esFavorito(usuarioId, tipo, elementoId, token = null) {
  // Compat: los llamadores viejos pasan usuarioId como 1er arg. El backend
  // ya sabe quién eres por el token; usuarioId solo se ignora.
  void usuarioId;
  const params = new URLSearchParams({ tipo: String(tipo), elementoId: String(elementoId) });
  const data = await fetchJson(
    `${BASE}/check?${params.toString()}`,
    authHeaders(token),
    'Error al consultar favorito'
  );
  const payload = data?.data ?? {};
  return {
    favorito: Boolean(payload.favorito),
    favoritoId: payload.favoritoId ?? null,
  };
}

/**
 * Agrega un favorito (vía toggle: si ya existe lo devuelve tal cual).
 */
export async function agregarFavorito({
  usuarioId,
  usuarioEmail,
  tipo,
  elementoId,
  url = '',
  token = null,
}) {
  void usuarioId;
  void usuarioEmail;
  const data = await fetchJson(
    `${BASE}/toggle`,
    {
      ...authHeaders(token),
      method: 'POST',
      body: JSON.stringify({ tipo, elementoId, url }),
    },
    'No fue posible agregar el favorito'
  );
  const payload = data?.data ?? {};
  return { id: payload.favoritoId ?? payload.entity?.id, ...payload };
}

/**
 * Elimina un favorito por id (solo si es del usuario autenticado).
 */
export async function eliminarFavorito(favoritoId, token = null) {
  await fetchJson(
    `${BASE}/${encodeURIComponent(favoritoId)}`,
    {
      ...authHeaders(token),
      method: 'DELETE',
    },
    'No fue posible eliminar el favorito'
  );
  return true;
}

/** Obtiene todos los favoritos del usuario autenticado (formato legacy). */
export async function getFavoritosUsuario(usuarioId, token = null) {
  void usuarioId;
  const data = await fetchFavoritos(token);
  return data?.data ?? [];
}

/**
 * Alterna el estado del favorito.
 *
 * Retorna: { favorito, favoritoId }
 */
export async function toggleFavorito({
  usuarioId,
  usuarioEmail,
  tipo,
  elementoId,
  url = '',
  token = null,
}) {
  void usuarioId;
  void usuarioEmail;
  const data = await fetchJson(
    `${BASE}/toggle`,
    {
      ...authHeaders(token),
      method: 'POST',
      body: JSON.stringify({ tipo, elementoId, url }),
    },
    'No fue posible actualizar el favorito'
  );
  const payload = data?.data ?? {};
  return {
    favorito: Boolean(payload.favorito),
    favoritoId: payload.favoritoId ?? null,
  };
}

export default {
  fetchFavoritos,
  esFavorito,
  agregarFavorito,
  eliminarFavorito,
  getFavoritosUsuario,
  toggleFavorito,
};

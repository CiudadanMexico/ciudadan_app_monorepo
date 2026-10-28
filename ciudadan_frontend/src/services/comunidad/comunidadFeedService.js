// src/services/comunidad/comunidadFeedService.js
// Feed real de la comunidad 4:20.
//
// Lee las publicaciones desde Strapi a través del endpoint público
// GET /api/comunidades/publicaciones (content-type `publicacion` del backend),
// con paginación server-side. Este servicio es el único punto que conoce la
// forma de la respuesta: la página recibe objetos ya normalizados.

import { fetchJson, STRAPI_URL } from '../../utils/request.utils';

const ENDPOINT = `${STRAPI_URL}/api/comunidades/publicaciones`;

export const PAGE_SIZE_POR_DEFECTO = 10;

/**
 * Convierte los bloques (rich text de Strapi) en texto plano para el feed.
 * @param {Array|string|undefined} bloques
 * @returns {string}
 */
export function textoDeBloques(bloques) {
  if (typeof bloques === 'string') return bloques.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!Array.isArray(bloques)) return '';

  const partes = [];
  const recorrer = (nodos) => {
    (Array.isArray(nodos) ? nodos : []).forEach((nodo) => {
      if (!nodo || typeof nodo !== 'object') return;
      if (typeof nodo.text === 'string') partes.push(nodo.text);
      if (Array.isArray(nodo.children)) recorrer(nodo.children);
    });
  };
  recorrer(bloques);

  return partes.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Normaliza una publicación de Strapi al modelo que usa la página.
 * @param {object} publicacion
 */
export function normalizarPublicacion(publicacion = {}) {
  const autor = publicacion.autor || {};
  const medio = publicacion.archivos || null;
  const urlMedio = medio && medio.url ? medio.url : null;

  return {
    id: publicacion.id,
    uid: publicacion.uid || null,
    texto: textoDeBloques(publicacion.contenido),
    autor: autor.username || autor.email || 'Ciudadan',
    imagen: urlMedio
      ? urlMedio.startsWith('http')
        ? urlMedio
        : `${STRAPI_URL}${urlMedio}`
      : null,
    fecha: publicacion.timestamp || publicacion.publishedAt || publicacion.createdAt || null,
  };
}

/**
 * Carga una página del feed de publicaciones.
 * @param {{page?: number, pageSize?: number}} opciones
 * @returns {Promise<{publicaciones: Array, paginacion: {page: number, pageSize: number, pageCount: number, total: number}}>}
 */
export async function getPublicacionesFeed({
  page = 1,
  pageSize = PAGE_SIZE_POR_DEFECTO,
} = {}) {
  const params = new URLSearchParams({
    'pagination[page]': String(page),
    'pagination[pageSize]': String(pageSize),
  });

  const respuesta = await fetchJson(
    `${ENDPOINT}?${params.toString()}`,
    {},
    'No se pudo cargar el feed de la comunidad'
  );

  const datos = Array.isArray(respuesta?.data) ? respuesta.data : [];
  const paginacion = respuesta?.meta?.pagination || {};

  return {
    publicaciones: datos.map(normalizarPublicacion),
    paginacion: {
      page: paginacion.page ?? page,
      pageSize: paginacion.pageSize ?? pageSize,
      pageCount: paginacion.pageCount ?? 1,
      total: paginacion.total ?? datos.length,
    },
  };
}

// src/services/comunidad/comunidadContactosService.js
// Contactos de Ciudadan Social.
//
// No existe un content-type "contacto": los contactos reales de la comunidad
// son las personas que forman parte de las agencias (members/socios). Este
// servicio lee GET /api/agencias con sus relaciones pobladas y devuelve las
// personas deduplicadas, con la agencia a la que pertenecen.
//
// Igual que en Chats, este es el unico punto que conoce la forma de la
// respuesta de Strapi.

import { fetchJson, STRAPI_URL } from '../../utils/request.utils';

const ENDPOINT = `${STRAPI_URL}/api/agencias`;

const texto = (valor) => (typeof valor === 'string' ? valor : '');

const atributosDe = (relacion) => {
  if (!relacion) return {};
  return relacion.attributes || relacion;
};

const idDe = (relacion) => {
  if (!relacion) return null;
  if (typeof relacion.id === 'number' || typeof relacion.id === 'string') return relacion.id;
  if (relacion.data) return idDe(relacion.data);
  return null;
};

const nombreDe = (persona) => {
  const attrs = atributosDe(persona);
  return attrs.nombre || attrs.name || attrs.username || attrs.email || 'Participante';
};

const inicialesDe = (nombre) =>
  String(nombre)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join('')
    .toUpperCase();

/**
 * Lista los contactos reales derivados de las agencias y sus miembros.
 * @param {{ pageSize?: number }} opciones
 * @returns {Promise<Array<object>>}
 */
export async function listarContactos({ pageSize = 50 } = {}) {
  const url = `${ENDPOINT}?populate=members,socios&pagination[pageSize]=${pageSize}`;
  const res = await fetchJson(url, {}, 'No se pudieron cargar los contactos');

  const agencias = Array.isArray(res?.data) ? res.data : [];
  const contactos = new Map();

  for (const agencia of agencias) {
    const attrs = agencia?.attributes || {};
    const nombreAgencia = texto(attrs.nombre) || 'Agencia';
    const tipoAgencia = texto(attrs.tipo);
    const relaciones = [attrs.members, attrs.socios].filter(Boolean);

    for (const relacion of relaciones) {
      const lista = Array.isArray(relacion?.data)
        ? relacion.data
        : Array.isArray(relacion)
          ? relacion
          : [];

      for (const persona of lista) {
        const id = idDe(persona);
        if (id === null) continue;

        const nombre = nombreDe(persona);
        const personaAttrs = atributosDe(persona);
        const clave = String(id);

        if (!contactos.has(clave)) {
          contactos.set(clave, {
            id: clave,
            title: nombre,
            subtitle: `${nombreAgencia}${tipoAgencia ? ` · ${tipoAgencia}` : ''}`,
            tags: ['persona', 'contacto', nombreAgencia],
            avatar: inicialesDe(nombre),
            email: texto(personaAttrs.email) || null,
            agencia: nombreAgencia,
            agenciaId: idDe(agencia),
          });
        }
      }
    }
  }

  return Array.from(contactos.values()).sort((a, b) =>
    a.title.localeCompare(b.title, 'es')
  );
}

/**
 * Normaliza contactos al shape que consume el buscador de Comunidad.
 * @param {Array<object>} contactos
 */
export function aItemsDeBusqueda(contactos) {
  return (contactos || []).map((contacto) => ({
    id: contacto.id,
    title: contacto.title,
    subtitle: contacto.subtitle,
    tags: contacto.tags || [],
  }));
}

export { inicialesDe };

// src/services/comunidad/comunidadGruposService.js
// Grupos de Ciudadan Social.
//
// No existe un content-type "grupo": los grupos de la comunidad son las
// `agencias` del backend (nodos con miembros, socios, wall y nivel de
// subsidio). Este servicio lee GET /api/agencias y devuelve los grupos con
// datos reales: nombre, tipo, localidad, numero de miembros y estadisticas.
//
// El CTA de WhatsApp NO se hardcodea: sale de la configuracion publica
// (GET /api/driver-verifier/public-config -> whatsappGroupUrl). Si el backend
// no la expone, el CTA no se pinta (nunca se inventa una URL).

import { fetchJson, STRAPI_URL } from '../../utils/request.utils';
import { getPublicConfig } from '../driverVerifierService';

const ENDPOINT = `${STRAPI_URL}/api/agencias`;

const texto = (valor) => (typeof valor === 'string' ? valor : '');

const atributosDe = (relacion) => {
  if (!relacion) return {};
  return relacion.attributes || relacion;
};

const largoDe = (relacion) => {
  if (!relacion) return 0;
  const datos = Array.isArray(relacion.data)
    ? relacion.data
    : Array.isArray(relacion)
      ? relacion
      : [];
  return datos.length;
};

const textoDe = (valor) => {
  if (typeof valor === 'string') return valor;
  if (Array.isArray(valor)) return valor.map((item) => textoDe(item)).filter(Boolean).join(' · ');
  if (valor && typeof valor === 'object') {
    return textoDe(valor.nombre || valor.name || valor.ciudad || '');
  }
  return '';
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
 * Lista los grupos reales (agencias) con sus miembros.
 * @param {{ pageSize?: number }} opciones
 * @returns {Promise<Array<object>>}
 */
export async function listarGrupos({ pageSize = 50 } = {}) {
  const url = `${ENDPOINT}?populate=members,socios&pagination[pageSize]=${pageSize}`;
  const res = await fetchJson(url, {}, 'No se pudieron cargar los grupos');

  const agencias = Array.isArray(res?.data) ? res.data : [];

  return agencias.map((agencia) => {
    const attrs = agencia?.attributes || {};
    const nombre = texto(attrs.nombre) || 'Grupo';
    const miembros = largoDe(attrs.members);
    const socios = largoDe(attrs.socios);
    const total = miembros || socios;

    return {
      id: String(agencia?.id ?? attrs.id ?? ''),
      title: nombre,
      subtitle: total
        ? `${total} ${total === 1 ? 'integrante' : 'integrantes'}`
        : texto(attrs.tipo) || 'Grupo de la comunidad',
      tags: ['grupo', texto(attrs.tipo) || 'comunidad'],
      avatar: inicialesDe(nombre),
      tipo: texto(attrs.tipo) || null,
      localidad: textoDe(attrs.localidad),
      wall: texto(attrs.wall),
      nivelSubsidio: attrs.nivel_subsidio ?? null,
      totalVerifications: Number(attrs.total_verifications || 0),
      totalAudited: Number(attrs.total_audited || 0),
      trustScore: attrs.trust_score ?? null,
      miembros: total,
    };
  });
}

/**
 * URL del grupo de WhatsApp tomada de la configuracion publica.
 * @returns {Promise<string|null>} null si no hay una URL https valida
 */
export async function obtenerUrlWhatsapp() {
  try {
    const config = await getPublicConfig();
    const url = config?.whatsappGroupUrl;
    return typeof url === 'string' && url.startsWith('https://') ? url : null;
  } catch {
    return null;
  }
}

/**
 * Normaliza grupos al shape que consume el buscador de Comunidad.
 * @param {Array<object>} grupos
 */
export function aItemsDeBusqueda(grupos) {
  return (grupos || []).map((grupo) => ({
    id: grupo.id,
    title: grupo.title,
    subtitle: grupo.subtitle,
    tags: grupo.tags || [],
  }));
}

export { inicialesDe };

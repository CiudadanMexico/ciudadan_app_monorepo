// src/services/comunidad/comunidadChatsService.js
// Chats de Ciudadan Social.
//
// Lee el content-type `message` de Strapi (GET /api/messages) y arma
// conversaciones a partir de los mensajes REALES: cada hilo es el par
// (emisor, receptor) de los mensajes, no un mock.
//
// Este es el unico punto que conoce la forma de la respuesta de Strapi; los
// componentes reciben objetos ya normalizados con la forma que usa el
// contenedor de pestanas de Comunidad:
//   { id, title, subtitle, tags: [], messages: [], messagesCount, unreadCount, ... }

import { fetchJson, STRAPI_URL } from '../../utils/request.utils';

const ENDPOINT = `${STRAPI_URL}/api/messages`;

const STATUS_SIN_LEER = new Set(['pendiente', 'unread', 'enviado', 'sent']);

const texto = (valor) => (typeof valor === 'string' ? valor : '');

const atributosDe = (relacion) => {
  if (!relacion) return {};
  if (relacion.attributes) return relacion.attributes;
  return relacion;
};

const idDe = (relacion) => {
  if (!relacion) return null;
  if (typeof relacion.id === 'number' || typeof relacion.id === 'string') return relacion.id;
  if (relacion.data) return idDe(relacion.data);
  return null;
};

const nombreDe = (relacion) => {
  const attrs = atributosDe(relacion);
  return (
    attrs.nombre ||
    attrs.name ||
    attrs.username ||
    attrs.email ||
    'Participante'
  );
};

const inicialesDe = (nombre) =>
  String(nombre)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join('')
    .toUpperCase();

const fechaCorta = (valor) => {
  if (!valor) return '';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '';
  const hoy = new Date();
  const mismoDia = fecha.toDateString() === hoy.toDateString();
  return mismoDia
    ? fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : fecha.toLocaleDateString([], { day: '2-digit', month: 'short' });
};

const claveDeConversacion = (emisor, receptor) => {
  const ids = [emisor, receptor].filter((id) => id !== null && id !== undefined);
  if (!ids.length) return null;
  return ids
    .map(String)
    .sort((a, b) => a.localeCompare(b))
    .join('|');
};

/**
 * Normaliza un mensaje de Strapi al modelo del hilo.
 * @param {object} item
 */
function normalizarMensaje(item) {
  const attrs = item?.attributes || {};
  const emisor = nombreDe(attrs.sender_id);
  const receptor = nombreDe(attrs.receiver_id);
  const status = texto(attrs.status).toLowerCase();

  return {
    id: item?.id ?? attrs.id ?? null,
    emisor,
    receptor,
    texto: texto(attrs.text),
    timestamp: attrs.timestamp || null,
    hora: fechaCorta(attrs.timestamp),
    status,
    sinLeer: STATUS_SIN_LEER.has(status),
  };
}

/**
 * Lista las conversaciones reales derivadas de /api/messages.
 * @param {{ pageSize?: number }} opciones
 * @returns {Promise<Array<object>>} conversaciones normalizadas
 */
export async function listarConversaciones({ pageSize = 100 } = {}) {
  const url = `${ENDPOINT}?populate=sender_id,receiver_id&sort[0]=timestamp:desc&pagination[pageSize]=${pageSize}`;
  const res = await fetchJson(url, {}, 'No se pudieron cargar las conversaciones');

  const items = Array.isArray(res?.data) ? res.data : [];
  const porClave = new Map();

  for (const item of items) {
    const attrs = item?.attributes || {};
    const emisorId = idDe(attrs.sender_id);
    const receptorId = idDe(attrs.receiver_id);
    const clave = claveDeConversacion(emisorId, receptorId) || `mensaje-${item?.id}`;

    if (!porClave.has(clave)) {
      const nombre = nombreDe(attrs.sender_id) || nombreDe(attrs.receiver_id) || 'Conversación';
      porClave.set(clave, {
        id: clave,
        title: nombre,
        subtitle: 'Conversación en Ciudadan Social',
        tags: ['conversacion', 'persona'],
        avatar: inicialesDe(nombre),
        messages: [],
        messagesCount: 0,
        unreadCount: 0,
        ultimoActividad: null,
      });
    }

    const conversacion = porClave.get(clave);
    const mensaje = normalizarMensaje(item);
    conversacion.messages.push(mensaje);
    conversacion.messagesCount += 1;
    if (mensaje.sinLeer) conversacion.unreadCount += 1;
    if (!conversacion.ultimoActividad || (mensaje.timestamp > conversacion.ultimoActividad)) {
      conversacion.ultimoActividad = mensaje.timestamp;
    }
  }

  return Array.from(porClave.values()).sort((a, b) =>
    String(b.ultimoActividad || '').localeCompare(String(a.ultimoActividad || ''))
  );
}

/**
 * Normaliza una lista de conversaciones al shape que consume el buscador de
 * la pagina de Comunidad ({ id, title, subtitle, tags }).
 * @param {Array<object>} conversaciones
 */
export function aItemsDeBusqueda(conversaciones) {
  return (conversaciones || []).map((conversacion) => ({
    id: conversacion.id,
    title: conversacion.title,
    subtitle: conversacion.subtitle,
    tags: conversacion.tags || [],
  }));
}

export { fechaCorta, inicialesDe };

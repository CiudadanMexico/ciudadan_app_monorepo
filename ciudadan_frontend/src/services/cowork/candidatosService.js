// src/services/cowork/candidatosService.js
//
// Candidatos (/candidatos) y gestión de postulaciones a socio en Coowork.
// - crearPostulacionSocio: POST público a /api/postulacion-socios (auth:false,
//   no requiere token). Envía la data + el CV como `files.cv` en FormData.
// - getMisPostulaciones: GET admin/socio/root — postulaciones de la agencia
//   del usuario (root ve todas).
// - resolverPostulacion: PATCH admin/socio/root — cambia estado + notas.

import { fetchJson, STRAPI_URL } from '../../utils/request.utils';

const BASE = `${STRAPI_URL}/api/postulacion-socios`;
const INV_BASE = `${STRAPI_URL}/api/invitaciones`;

/**
 * Crea una postulación de candidato a socio.
 *
 * El endpoint es público (POST /api/postulacion-socios, auth:false) y el
 * backend es el dueño del estado: aquí solo se mandan los datos que el
 * visitante puede completar (los ids de área/agencia van como número).
 *
 * @param {Object} data { nombre_completo, email, telefono, codigo_pais, area (id), agencia (id), descripcion, consentimiento (bool), cv (File, opcional) }
 * @param {string|null} token Token Auth0 (opcional: la ruta es pública).
 */
export async function crearPostulacionSocio(data, token = null) {
  const payload = {
    nombre_completo: data.nombre_completo,
    email: data.email,
    telefono: data.telefono,
    codigo_pais: data.codigo_pais,
    area: data.area ? Number(data.area) : null,
    agencia: data.agencia ? Number(data.agencia) : null,
    descripcion: data.descripcion || '',
    // El consentimiento lo marca el visitante en el formulario: aquí sólo se
    // propaga su valor real (el backend lo exige para aceptar la postulación).
    consentimiento: data.consentimiento === true,
  };

  // El CV (media) viaja en la misma petición como FormData con el prefijo
  // `files.` (convención de Strapi). No se fija Content-Type: el navegador
  // debe poner el boundary del multipart.
  const form = new FormData();
  form.append('data', JSON.stringify(payload));
  if (data.cv) {
    form.append('files.cv', data.cv, data.cv.name);
  }

  return fetchJson(
    BASE,
    {
      method: 'POST',
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
      body: form,
    },
    'No se pudo enviar tu postulación'
  );
}

/** Postulaciones de la agencia del usuario autenticado (root: todas). */
export const getMisPostulaciones = (token = null) =>
  fetchJson(
    `${BASE}/mi-agencia`,
    {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
    'No se pudieron cargar las postulaciones'
  );

/** Lista invitaciones de la agencia autenticada (pendientes por defecto). */
export const getInvitaciones = (token = null, { estado = 'pendiente', limit = 100 } = {}) => {
  const params = new URLSearchParams();
  if (estado) params.set('filters[estado][$eq]', estado);
  params.set('pagination[limit]', String(limit));
  params.set('sort[0]', 'fecha_invitacion:desc');
  return fetchJson(
    `${INV_BASE}?${params.toString()}`,
    {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
    'No se pudieron cargar las invitaciones'
  );
};

/** Cambia el estado de una postulación (revisada/contactada/aceptada/rechazada). */
export const resolverPostulacion = (id, { estado, notas } = {}, token = null) =>
  fetchJson(
    `${BASE}/${id}/estado`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ estado, notas }),
    },
    'No se pudo actualizar la postulación'
  );

export default { crearPostulacionSocio, getMisPostulaciones, resolverPostulacion, getInvitaciones };

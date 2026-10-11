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

/**
 * Crea una postulación de candidato a socio.
 * @param {Object} data { nombre_completo, email, telefono, codigo_pais, area (id), descripcion, cv (File, opcional) }
 */
export async function crearPostulacionSocio(data, token = null) {
  const payload = {
    data: {
      nombre_completo: data.nombre_completo,
      email: data.email,
      telefono: data.telefono,
      codigo_pais: data.codigo_pais,
      area: data.area || null,
      agencia: data.agencia || null,
      descripcion: data.descripcion || '',
      estado: 'pendiente',
      fecha_solicitud: new Date().toISOString(),
      metadata: data.metadata || {},
      publishedAt: new Date().toISOString(),
    },
  };

  // El CV (media) no se puede crear desde una URL sin el pipeline de uploads:
  // el backend acepta { nombre, tipo, dataBase64 } vía FormData en la misma
  // petición. Se envía como campo `files.cv`.
  const form = new FormData();
  form.append('data', JSON.stringify(payload.data));
  if (data.cv) {
    form.append('files.cv', data.cv, data.cv.name);
  }

  const res = await fetch(`${BASE}`, {
    method: 'POST',
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    body: form,
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.error?.message || 'No se pudo enviar tu postulación');
  }
  return json;
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

export default { crearPostulacionSocio, getMisPostulaciones, resolverPostulacion };

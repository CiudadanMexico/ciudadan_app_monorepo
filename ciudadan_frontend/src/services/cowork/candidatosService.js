// src/services/cowork/candidatosService.js
//
// Candidatos (/candidatos) e invitaciones de agencia.
// - crearPostulacionSocio: POST público a /api/postulacion-socios (la ruta es
//   auth:false en el backend; no requiere token). Guarda el CV como base64 en
//   el mismo POST (igual que subirEvidencia) — la columna `cv` es media.
// - getInvitaciones: lista de invitaciones de la agencia (pendientes por
//   defecto; filtrable por estado) para el tab de Agregar Socio.

import { fetchJson, STRAPI_URL } from '../../utils/request.utils';

const BASE = `${STRAPI_URL}/api/postulacion-socios`;
const INV_BASE = `${STRAPI_URL}/api/invitaciones`;

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

export default { crearPostulacionSocio, getInvitaciones };

import { fetchJson, STRAPI_URL } from '../../utils/request.utils';

/**
 * Servicios de REVISION de repartidores (agencia + federal) para el tab
 * Cowork → Verificar Repartidores (spec §12B/§12C/§12D/§12F).
 *
 * El backend aplica la policy is-delivery-reviewer (socio/admin/root con
 * agencia) y verifica ambito/vigencia/no-auto-aprobacion en CADA request; el
 * filtro de agencia del frontend es solo UX, nunca seguridad.
 */

const BASE = `${STRAPI_URL}/api/delivery-registration`;

const headersJson = (token) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

const headersAuth = (token) => ({
  Authorization: `Bearer ${token}`,
});

export const revisionService = {
  /** Cola paginada de expedientes de SU agencia (root ve todas). */
  cola: (token, { status, limit = 100, start = 0 } = {}) => {
    const params = new URLSearchParams({ limit: String(limit), start: String(start) });
    if (status) params.set('status', status);
    return fetchJson(
      `${BASE}/agency/queue?${params.toString()}`,
      { headers: headersAuth(token) },
      'No se pudo cargar la cola de repartidores'
    );
  },

  /** Detalle completo del expediente (CLABE enmascarada, eventos, senales). */
  detalle: (token, id) =>
    fetchJson(
      `${BASE}/agency/${id}`,
      { headers: headersAuth(token) },
      'No se pudo cargar el expediente'
    ),

  /** Registro de cotejo por documento (spec §12B). */
  registrarCotejo: (token, id, body) =>
    fetchJson(
      `${BASE}/agency/${id}/document-checks`,
      { method: 'POST', headers: headersJson(token), body: JSON.stringify(body) },
      'No se pudo registrar el cotejo'
    ),

  /** Clasificacion normativa de la bicicleta electrica (spec §4.3). */
  clasificarVehiculo: (token, id, body) =>
    fetchJson(
      `${BASE}/agency/${id}/vehicle-classification`,
      { method: 'POST', headers: headersJson(token), body: JSON.stringify(body) },
      'No se pudo clasificar el vehiculo'
    ),

  pedirCorrecciones: (token, id, body) =>
    fetchJson(
      `${BASE}/agency/${id}/request-corrections`,
      { method: 'POST', headers: headersJson(token), body: JSON.stringify(body) },
      'No se pudieron solicitar las correcciones'
    ),

  marcarElegibleVideo: (token, id) =>
    fetchJson(
      `${BASE}/agency/${id}/mark-video-eligible`,
      { method: 'POST', headers: headersJson(token), body: '{}' },
      'No se pudo marcar como elegible para video'
    ),

  registrarValidacionZoom: (token, id, body) =>
    fetchJson(
      `${BASE}/agency/${id}/video-validation`,
      { method: 'POST', headers: headersJson(token), body: JSON.stringify(body) },
      'No se pudo registrar la validación por video'
    ),

  aprobar: (token, id) =>
    fetchJson(
      `${BASE}/agency/${id}/approve`,
      { method: 'POST', headers: headersJson(token), body: '{}' },
      'No se pudo aprobar el expediente'
    ),

  rechazar: (token, id, body) =>
    fetchJson(
      `${BASE}/agency/${id}/reject`,
      { method: 'POST', headers: headersJson(token), body: JSON.stringify(body) },
      'No se pudo rechazar el expediente'
    ),

  suspender: (token, id, body) =>
    fetchJson(
      `${BASE}/agency/${id}/suspend`,
      { method: 'POST', headers: headersJson(token), body: JSON.stringify(body) },
      'No se pudo suspender el expediente'
    ),

  revalidar: (token, id) =>
    fetchJson(
      `${BASE}/agency/${id}/revalidate`,
      { method: 'POST', headers: headersJson(token), body: '{}' },
      'No se pudo revalidar el expediente'
    ),

  reabrir: (token, id, body) =>
    fetchJson(
      `${BASE}/agency/${id}/reopen`,
      { method: 'POST', headers: headersJson(token), body: JSON.stringify(body) },
      'No se pudo reabrir el expediente'
    ),

  /**
   * Descarga PRIVADA de una evidencia (streaming autenticado): devuelve un
   * blob URL efimero para <img>/<video>. Nunca existe una URL publica.
   */
  abrirEvidencia: async (token, expedienteId, fileId) => {
    const res = await fetch(`${BASE}/agency/${expedienteId}/evidence/${fileId}`, {
      credentials: 'include',
      headers: headersAuth(token),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error?.message || 'No se pudo abrir la evidencia');
    }
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },
};

/** Bandeja FEDERAL (agencia tipo federal o root; policy is-delivery-federal). */
export const federalService = {
  casos: (token, { limit = 100, start = 0 } = {}) =>
    fetchJson(
      `${BASE}/federal/cases?limit=${limit}&start=${start}`,
      { headers: headersAuth(token) },
      'No se pudo cargar la bandeja federal'
    ),

  resolver: (token, signalId, body) =>
    fetchJson(
      `${BASE}/federal/cases/${signalId}/resolve`,
      { method: 'POST', headers: headersJson(token), body: JSON.stringify(body) },
      'No se pudo registrar la resolución federal'
    ),
};

export default revisionService;

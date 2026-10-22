import { fetchJson, STRAPI_URL } from '../../utils/request.utils';

/**
 * Servicios del MVP de repartidores (api::delivery-registration).
 *
 * Convenciones del repo (docs/REPARTIDORES-MVP-FASE-A-AUDITORIA.md §1.6):
 *  - HTTP centralizado por fetchJson (utils/request.utils.js), nunca fetch crudo.
 *  - Bearer Auth0 con audience https://api.ciudadan.org; el token lo aporta
 *    el componente via useAuth0().getAccessTokenSilently (patron
 *    DriverVerificationPage.jsx:65-77 / RolesContext.jsx:29-47).
 *  - La subida de archivos usa /api/upload (override Auth0 existente) y el
 *    backend la REGISTRA por slot con validaciones y hash (never URL publica).
 */

const BASE = `${STRAPI_URL}/api/delivery-registration`;

const headersJson = (token) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

const headersAuth = (token) => ({
  Authorization: `Bearer ${token}`,
});

/** Sube un archivo a la media library de Strapi (override Auth0). */
const subirArchivo = async (token, file) => {
  const fd = new FormData();
  fd.append('files', file);

  const res = await fetch(`${STRAPI_URL}/api/upload`, {
    method: 'POST',
    credentials: 'include',
    headers: headersAuth(token),
    body: fd,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error?.message || 'No se pudo subir el archivo');
  }
  const archivo = Array.isArray(data) ? data[0] : data;
  if (!archivo?.id) throw new Error('La subida no devolvio un archivo valido');
  return archivo;
};

export const repartidorService = {
  /** Agencias activas elegibles de la ciudad (MVP: CDMX). */
  obtenerCobertura: (token, territory = 'CDMX') =>
    fetchJson(
      `${BASE}/coverage?territory=${encodeURIComponent(territory)}`,
      { headers: headersAuth(token) },
      'No se pudo consultar la cobertura de repartidores'
    ),

  /** Lista de espera voluntaria (sin cobertura): solo email de sesion + ciudad + consentimiento. */
  suscribirWaitlist: (token, { city, municipality, consent }) =>
    fetchJson(
      `${BASE}/waitlist`,
      {
        method: 'POST',
        headers: headersJson(token),
        body: JSON.stringify({ city, municipality, consent }),
      },
      'No se pudo registrar tu correo en la lista de espera'
    ),

  darDeBajaWaitlist: (token) =>
    fetchJson(
      `${BASE}/waitlist/unsubscribe`,
      { method: 'POST', headers: headersJson(token), body: '{}' },
      'No se pudo dar de baja de la lista de espera'
    ),

  /** Inicia el expediente (idempotente; agency_id validado en el backend). */
  iniciarExpediente: (token, { agency_id, territory = 'CDMX' }) =>
    fetchJson(
      BASE,
      {
        method: 'POST',
        headers: headersJson(token),
        body: JSON.stringify({ agency_id, territory }),
      },
      'No se pudo iniciar tu expediente'
    ),

  /** Expediente propio con requisitos pendientes (falta nada sensible). */
  miExpediente: (token) =>
    fetchJson(`${BASE}/me`, { headers: headersAuth(token) }, 'No se pudo cargar tu expediente'),

  /** Edicion de campos permitidos (estados editables unicamente). */
  actualizarExpediente: (token, campos) =>
    fetchJson(
      `${BASE}/me`,
      {
        method: 'PATCH',
        headers: headersJson(token),
        body: JSON.stringify(campos),
      },
      'No se pudo guardar tu informacion'
    ),

  /** Vehiculo condicional por tipo (MVP: uno; re-registrar actualiza). */
  registrarVehiculo: (token, datos) =>
    fetchJson(
      `${BASE}/me/vehicles`,
      {
        method: 'POST',
        headers: headersJson(token),
        body: JSON.stringify(datos),
      },
      'No se pudo guardar tu vehiculo'
    ),

  /** Sube el archivo y lo adjunta al slot validado (slot + file_id). */
  subirEvidencia: async (token, { slot, file, vehicle_id }) => {
    const archivo = await subirArchivo(token, file);
    return fetchJson(
      `${BASE}/me/evidence`,
      {
        method: 'POST',
        headers: headersJson(token),
        body: JSON.stringify({ slot, file_id: archivo.id, vehicle_id }),
      },
      'No se pudo adjuntar la evidencia'
    );
  },

  /** Descarga privada de una evidencia propia (streaming autenticado). */
  urlEvidenciaPropia: (fileId) => `${BASE}/me/evidence/${fileId}`,

  /** Cuestionario (sin respuestas correctas) + intentos previos. */
  obtenerCuestionario: (token) =>
    fetchJson(
      `${BASE}/me/training`,
      { headers: headersAuth(token) },
      'No se pudo cargar la capacitacion'
    ),

  /** Presenta el examen; la calificacion es server-side (aprobado >= 8/10). */
  presentarExamen: (token, respuestas) =>
    fetchJson(
      `${BASE}/me/training`,
      {
        method: 'POST',
        headers: headersJson(token),
        body: JSON.stringify({ respuestas }),
      },
      'No se pudo enviar tu examen'
    ),

  /** Envia a revision tras prechecks de completitud (server-side). */
  enviarExpediente: (token) =>
    fetchJson(
      `${BASE}/me/submit`,
      { method: 'POST', headers: headersJson(token), body: '{}' },
      'No se pudo enviar tu expediente'
    ),
};

export default repartidorService;

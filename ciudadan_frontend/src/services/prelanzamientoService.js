import { fetchJson, STRAPI_URL } from '../utils/request.utils';

// Grupo oficial que ya utiliza Pages/ComunidadPage.jsx.
export const WHATSAPP_COMUNIDAD = 'https://chat.whatsapp.com/Kfc6OeZCTNlChmMMZwoQkh';

export function registrarPrelanzamiento(data) {
  return fetchJson(`${STRAPI_URL}/api/prelanzamiento`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  }, 'No pudimos guardar tu solicitud. Revisa tu conexión e inténtalo de nuevo.');
}

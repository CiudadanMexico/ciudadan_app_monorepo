/**
 * Servicios de la Generación Fundadora 2026 — usa el helper central
 * fetchJson (src/utils/request.utils.js), sin fetch inline.
 */
import { STRAPI_URL, fetchJson } from '../../utils/request.utils';

const BASE = `${STRAPI_URL}/api/generation-applications`;

export const generationService = {
  /**
   * Envía el registro común. `answers` agrupa los campos variables por vía
   * en un solo objeto JSON (spec 12).
   */
  async submitApplication({ via, common = {}, answers = {}, tracking = {}, authToken }) {
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ via, common, answers, tracking }),
    };

    // Si el visitante ya está autenticado con Auth0, vinculamos el registro
    // a su usuario de Strapi (policy try-auth0-user del backend).
    if (authToken) {
      options.headers.Authorization = `Bearer ${authToken}`;
    }

    return fetchJson(
      `${BASE}/submit`,
      options,
      'No pudimos enviar tu registro. Inténtalo de nuevo en unos minutos.'
    );
  },
};

export default generationService;

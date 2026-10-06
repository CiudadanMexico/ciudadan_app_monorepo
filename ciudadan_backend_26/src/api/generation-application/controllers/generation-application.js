'use strict';

/**
 * generation-application controller
 *
 * CRUD core (admin) + endpoint público `submit` para el registro común de la
 * Generación Fundadora 2026 (spec 12). El frontend envía:
 *   { via, common: {nombre, email, ...}, answers: {campos por vía}, tracking: {utm_*, referrer} }
 * - `via` (hackabot|vallecatnip|creadores|aliados|general) → columna `path`
 * - campos comunes → columnas del modelo; `descripcion` y `consentimiento` → `answers`
 * - campos variables por vía → `answers` JSON (sin duplicar columnas por vía)
 * - tracking UTM (spec 13) → columnas utm_* + referrer
 */

const { createCoreController } = require('@strapi/strapi').factories;

const MAX_TEXT = 4000;
const MAX_SHORT = 255;

const cleanString = (value, max = MAX_SHORT) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_PATHS = ['hackabot', 'vallecatnip', 'creadores', 'aliados', 'general'];
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];

module.exports = createCoreController('api::generation-application.generation-application', {
  /**
   * POST /api/generation-applications/submit
   * Ruta pública (auth:false + try-auth0-user): si el navegador trae token
   * Auth0 válido se vincula la postulación al usuario existente (sin duplicar
   * su información); un visitante anónimo también puede registrarse.
   */
  async submit(ctx) {
    const body = ctx.request.body || {};
    const common = body.common && typeof body.common === 'object' ? body.common : {};
    const tracking = body.tracking && typeof body.tracking === 'object' ? body.tracking : {};

    // --- Validación mínima: nombre + email válidos + consentimiento ---
    const name = cleanString(common.nombre, 160);
    const email = cleanString(common.email, 160)?.toLowerCase() || null;
    if (!name) return ctx.badRequest('El nombre es obligatorio.');
    if (!email || !EMAIL_RE.test(email)) {
      return ctx.badRequest('Un correo electrónico válido es obligatorio.');
    }
    if (common.consentimiento !== true && common.consentimiento !== 'true') {
      return ctx.badRequest('Debes aceptar el uso de tus datos para evaluar tu incorporación.');
    }

    // --- Vía: body.via es la fuente primaria; tracking.via es respaldo ---
    const rawVia = cleanString(body.via, 40) || cleanString(tracking.via, 40);
    const path = VALID_PATHS.includes(rawVia) ? rawVia : 'general';

    // --- Campos comunes → columnas del modelo (spec 12) ---
    const payload = {
      name,
      email,
      phone: cleanString(common.telefono, 40),
      path,
      status: 'new',
      source: cleanString(common.comoSeEntero, 120),
      city: cleanString(common.ciudad, 120),
      state: cleanString(common.estado, 120),
      availability: cleanString(common.disponibilidad, 120),
      discord: cleanString(common.discord, 120),
      portfolio: cleanString(common.portfolio, MAX_TEXT),
      referrer: cleanString(tracking.referrer, 500),
    };

    // --- Tracking UTM (spec 13) ---
    UTM_KEYS.forEach((key) => {
      payload[key] = cleanString(tracking[key], 160);
    });

    // --- Campos variables por vía → `answers` JSON (spec 12) ---
    const answers = {};
    if (typeof common.descripcion === 'string' && common.descripcion.trim()) {
      answers.descripcion = common.descripcion.trim().slice(0, MAX_TEXT);
    }
    answers.consentimiento = true;
    if (body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers)) {
      for (const [key, value] of Object.entries(body.answers)) {
        if (typeof value === 'string') answers[key] = value.slice(0, MAX_TEXT);
        else if (typeof value === 'number' || typeof value === 'boolean') answers[key] = value;
        else if (value === null) answers[key] = null;
      }
    }
    payload.answers = answers;

    // --- Vínculo con usuario existente (sin duplicar su info) ---
    // try-auth0-user llena ctx.state.strapiUser si venía un Bearer Auth0 válido.
    const strapiUser = ctx.state?.strapiUser;
    if (strapiUser?.id) {
      payload.user = strapiUser.id;
      payload.email = strapiUser.email?.toLowerCase() || payload.email;
    }

    const entry = await strapi.entityService.create('api::generation-application.generation-application', {
      data: payload,
    });

    // Respuesta sin PII: sólo confirmación + id de referencia.
    return ctx.created({
      data: {
        id: entry.id,
        status: entry.status,
        path: entry.path,
      },
      message: 'Postulación recibida. Te contactaremos por correo.',
    });
  },
});


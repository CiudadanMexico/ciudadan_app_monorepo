'use strict';

/**
 * Validacion del enlace de la sesion Zoom (spec §12F).
 *
 * Zoom es EXTERNO: Ciudadan no crea, calendariza ni convoca reuniones; solo
 * registra por expediente la URL de la sesion en la que se valido
 * individualmente a la persona, la fecha real, el responsable y el resultado.
 *
 * Reglas de seguridad del enlace:
 *  - HTTPS obligatorio.
 *  - Dominio permitido: zoom.us (incluye subdominios, p.ej. us02web.zoom.us).
 *  - Sin credenciales embebidas (user:pass@) ni contrasenas/tokens en el query
 *    ("evitar URLs con contrasenas o tokens incrustados si se puede").
 */

const DOMINIOS_PERMITIDOS = ['zoom.us'];

function hostPermitido(hostname) {
  const host = String(hostname || '').toLowerCase();
  return DOMINIOS_PERMITIDOS.some(
    (dominio) => host === dominio || host.endsWith(`.${dominio}`)
  );
}

/** Claves de query consideradas secretas y por tanto prohibidas. */
const CLAVES_PROHIBIDAS = ['pwd', 'passwd', 'password', 'pass', 'token', 'tk'];

/**
 * Valida una URL de sesion Zoom.
 * Devuelve { ok, url, errores[] }.
 */
function validarUrlZoom(url) {
  const errores = [];
  let parsed = null;

  if (typeof url !== 'string' || !url.trim()) {
    return { ok: false, url: null, errores: ['URL de la sesion Zoom requerida (validacion ordinaria, spec 12F)'] };
  }

  try {
    parsed = new URL(url.trim());
  } catch {
    return { ok: false, url: null, errores: ['La URL de la sesion Zoom no es valida'] };
  }

  if (parsed.protocol !== 'https:') errores.push('El enlace de Zoom debe usar HTTPS');
  if (!hostPermitido(parsed.hostname)) {
    errores.push(`El dominio debe ser de Zoom (${DOMINIOS_PERMITIDOS.join(', ')})`);
  }
  if (parsed.username || parsed.password) {
    errores.push('El enlace no debe incluir credenciales embebidas');
  }
  for (const [clave] of parsed.searchParams) {
    if (CLAVES_PROHIBIDAS.includes(clave.toLowerCase())) {
      errores.push('El enlace no debe incluir contrasenas ni tokens en la URL');
      break;
    }
  }

  return { ok: errores.length === 0, url: parsed.toString(), errores };
}

module.exports = {
  DOMINIOS_PERMITIDOS,
  validarUrlZoom,
};

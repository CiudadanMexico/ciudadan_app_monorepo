'use strict';

/**
 * Formateo de la fecha de lanzamiento. El día de la semana SIEMPRE se deriva
 * de la fecha almacenada en Strapi: nunca se escribe "sábado" a mano.
 */

const ZONA = 'America/Mexico_City';

/** "16 de octubre de 2026" (o null si no hay fecha válida). */
function formatearLanzamiento(valor) {
  if (!valor) return null;
  const ms = Date.parse(valor);
  if (Number.isNaN(ms)) return null;
  try {
    return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: ZONA }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString().slice(0, 10);
  }
}

module.exports = { formatearLanzamiento, ZONA };

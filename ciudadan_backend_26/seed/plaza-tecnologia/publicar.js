'use strict';
/* Helper de publicacion para el seed de Plaza Tecnologia.
 *
 * Contexto (bug corregido el 2026-10-28): el seed solo asignaba `publishedAt`
 * en el path CREATE, de modo que `--apply --publish` dejaba sin publicar
 * (published_at NULL) los productos y la tienda que ya existian de corridas
 * anteriores. Este helper centraliza la regla y la deja testeable.
 *
 * Regla: NUNCA se despublica nada. Solo se asigna `publishedAt` cuando el
 * registro todavia no lo tiene.
 */

/**
 * Asigna `publishedAt` al parche cuando el registro actual no esta publicado.
 * @param {object} patch Objeto de datos que se enviara a entityService.update/create.
 * @param {object|null} actual Registro actual (con `publishedAt`) o null si es nuevo.
 * @param {function} [ahora] Inyectable para pruebas (por defecto, ISO actual).
 * @returns {object} El mismo `patch`, ya sea con o sin `publishedAt`.
 */
function publicarSiHaceFalta(patch, actual, ahora) {
  if (actual && actual.publishedAt) return patch;
  patch.publishedAt = typeof ahora === 'function' ? ahora() : new Date().toISOString();
  return patch;
}

module.exports = { publicarSiHaceFalta };

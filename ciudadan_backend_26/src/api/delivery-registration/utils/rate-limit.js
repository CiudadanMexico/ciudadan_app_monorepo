'use strict';

/**
 * Rate limiting in-memory de mejor esfuerzo (patron ya usado por
 * driver-launch-lead/controllers/driver-launch.js:30-56: ventana por hash,
 * sin guardar IPs en claro).
 *
 * Alcance: protege los endpoints publicos/sensibles del MVP de repartidores
 * (lista de espera). Single-instance por diseno; documentado como limitacion.
 */

const crypto = require('crypto');

function hashDeClave(clave) {
  return crypto.createHash('sha256').update(String(clave)).digest('hex').slice(0, 32);
}

/**
 * Crea un limitador por ventana fija.
 * @param {{ ventanaMs: number, max: number }} opciones
 */
function crearRateLimiter({ ventanaMs = 10 * 60 * 1000, max = 40 } = {}) {
  const cubos = new Map();

  // Limpieza oportunista para no crecer sin control.
  setInterval(() => {
    const ahora = Date.now();
    for (const [clave, cubo] of cubos) {
      if (cubo.reinicio <= ahora) cubos.delete(clave);
    }
  }, Math.max(ventanaMs, 60_000)).unref?.();

  return {
    /**
     * @param {string} clave materia prima (ip+email, etc.) — se hashea.
     * @returns {{ permitido: boolean, restantes: number, reintentoEnMs: number }}
     */
    permit(clave) {
      const ahora = Date.now();
      const hash = hashDeClave(clave);
      const cubo = cubos.get(hash);

      if (!cubo || cubo.reinicio <= ahora) {
        cubos.set(hash, { contador: 1, reinicio: ahora + ventanaMs });
        return { permitido: true, restantes: max - 1, reintentoEnMs: ventanaMs };
      }

      if (cubo.contador >= max) {
        return { permitido: false, restantes: 0, reintentoEnMs: cubo.reinicio - ahora };
      }

      cubo.contador += 1;
      return { permitido: true, restantes: max - cubo.contador, reintentoEnMs: cubo.reinicio - ahora };
    },
  };
}

module.exports = { crearRateLimiter, hashDeClave };

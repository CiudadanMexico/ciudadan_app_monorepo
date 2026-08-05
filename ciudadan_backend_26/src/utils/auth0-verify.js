'use strict';

const axios = require('axios');

/**
 * Verificación de token Auth0 con caché en memoria.
 *
 * BUG REAL ENCONTRADO: cada policy custom (is-authenticated-auth0,
 * is-admin-or-socio, can-calificar-tarea, can-asignar-tarea, is-verificador,
 * is-admin-or-socio-or-verificador) hacía su PROPIA llamada independiente a
 * `https://${AUTH0_DOMAIN}/userinfo` en CADA request. El frontend dispara
 * varias peticiones casi simultáneas (efectos de React, o incluso el doble
 * disparo de React.StrictMode en desarrollo), así que para una sola carga
 * de pantalla se hacían N llamadas a Auth0 con el MISMO token al mismo
 * tiempo. Se confirmó en el log del servidor: la MISMA request
 * (`GET /tareas/filtrar?...`) respondió 200 y, 213ms después, la copia
 * duplicada (StrictMode) respondió 403 "token inválido en Auth0" — con el
 * mismo token, imposible que haya expirado en ese lapso. Es Auth0
 * limitando la tasa de `/userinfo`, no un token vencido.
 *
 * Fix: cachear el resultado de `/userinfo` por token durante unos segundos
 * (bien por debajo de la vida útil real de un access token) para que
 * llamadas casi simultáneas con el mismo token no vuelvan a golpear Auth0.
 * Solo se cachean verificaciones EXITOSAS — un fallo nunca se cachea, para
 * no bloquear a alguien con un token realmente inválido/expirado.
 */

const CACHE_TTL_MS = 30 * 1000; // 30s: suficiente para absorber ráfagas, corto para no confiar de más en un token que de verdad expiró.
const cache = new Map(); // token -> { emailPromise, cachedAt }

function cleanupExpired() {
  const now = Date.now();
  for (const [token, entry] of cache.entries()) {
    if (now - entry.cachedAt > CACHE_TTL_MS) {
      cache.delete(token);
    }
  }
}

/**
 * Devuelve el email asociado al access token de Auth0, usando caché.
 * Lanza si el token es inválido o Auth0 rechaza la verificación.
 *
 * OJO: se cachea la PROMESA en vuelo, no solo el resultado ya resuelto.
 * Si solo se cacheara el resultado, N llamadas verdaderamente concurrentes
 * (todas disparadas antes de que la primera termine — exactamente el caso
 * real: varios efectos de React pidiendo el mismo token al mismo tiempo)
 * verían la caché vacía y cada una haría su propia llamada a Auth0 de
 * todos modos. Cacheando la promesa, la 2ª..Nª llamada reutiliza la MISMA
 * request en vuelo en vez de disparar una nueva.
 */
function getAuth0Email(token, { strapi } = {}) {
  const cached = cache.get(token);
  if (cached && Date.now() - cached.cachedAt <= CACHE_TTL_MS) {
    return cached.emailPromise;
  }

  const emailPromise = (async () => {
    const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
    if (!AUTH0_DOMAIN) {
      throw new Error('Falta AUTH0_DOMAIN en el .env');
    }

    const { data } = await axios.get(`https://${AUTH0_DOMAIN}/userinfo`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!data?.email) {
      throw new Error('Auth0 no devolvió email');
    }

    return data.email;
  })();

  cache.set(token, { emailPromise, cachedAt: Date.now() });
  if (cache.size > 500) cleanupExpired();

  // Si la request falla, no dejamos el fallo cacheado — un token realmente
  // inválido/expirado no debe quedar "atascado" bloqueando reintentos.
  emailPromise.catch(() => cache.delete(token));

  return emailPromise;
}

module.exports = { getAuth0Email };

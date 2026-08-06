'use strict';

/**
 * Policy: allow-public-relations
 *
 * BUG ENCONTRADO (revisando por qué "Tareas Especializadas" no traía áreas):
 * las rutas find/findOne de todo/tarea/area/agencia usan `auth: false` para
 * ser públicas (spec: tareas generales visibles sin login). Pero Strapi
 * internamente (`services/auth/index.js`) SOLO llena `ctx.state.auth`
 * cuando `auth !== false` — con `auth:false` esa asignación nunca corre,
 * pase lo que pase con el token.
 *
 * El problema: el sanitizador que decide si puede devolver una RELACIÓN
 * poblada (`populate[areas]=*`, `populate[usuario]=*`, etc. — ver
 * @strapi/utils `throw-restricted-relations` / `remove-restricted-relations`)
 * llama a `strapi.auth.verify(ctx.state.auth, { scope })`. Si `auth` es
 * `undefined` (que es SIEMPRE el caso en estas rutas), `verify()` lanza
 * `UnauthorizedError` de inmediato — y el sanitizador, al capturar ese
 * error, trata la relación como "sin permiso" y la BORRA de la respuesta
 * en silencio (no truena, simplemente no aparece). Esto rompía TODO
 * populate de relaciones (areas, subareas, usuario, todo, parent_area,
 * asignado_a, etc.) en estas rutas, para cualquier usuario, con o sin
 * sesión — el bug que hacía que "Tareas Especializadas" nunca trajera
 * áreas aunque los nombres ya estuvieran bien cargados en la DB.
 *
 * Fix: esta policy corre ANTES del controller (agregada al array de
 * `policies` de find/findOne) y rellena `ctx.state.auth` con un objeto
 * mínimo válido cuya `strategy` NO tiene método `verify` — así
 * `strapi.auth.verify()` no lanza error (ver services/auth/index.js:
 * `if (typeof auth.strategy.verify === 'function') {...}`, si no es
 * función simplemente no valida nada) y el sanitizador deja pasar la
 * relación. Solo aplica a rutas YA marcadas como públicas (auth:false);
 * no afecta ninguna policy de escritura ni las policies custom de Auth0
 * que ya validan permisos reales antes de llegar al controller.
 */
module.exports = (ctx) => {
  if (!ctx.state.auth) {
    ctx.state.auth = {
      strategy: { name: 'public-read-passthrough' },
      credentials: null,
      ability: null,
    };
  }
  return true;
};

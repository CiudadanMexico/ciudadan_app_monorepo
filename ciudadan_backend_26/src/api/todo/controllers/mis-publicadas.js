'use strict';

/**
 * GET /api/todos/mi-agencia
 *
 * Tareas (todo) PUBLICADAS por el socio autenticado dentro de SU agencia.
 * Es la fuente de datos de **TodoToken** (Wallet → "Mis tareas publicadas",
 * ruta frontend `/coowork/mi-agencia/tareas`).
 *
 * Seguridad — el backend NO confía en filtros del frontend:
 *   - El usuario, su agencia y su rol se resuelven SIEMPRE server-side desde
 *     `ctx.state.strapiUser` (lo setea la policy `global::is-authenticated-auth0`).
 *     No se leen `usuarioId`/`agenciaId` de query params, así que un usuario no
 *     puede cambiar un id en DevTools para ver las tareas de otro socio.
 *   - `creador` = usuario autenticado → aislamiento real entre socios de una
 *     misma agencia (spec sección 11).
 *
 * Requiere DOS condiciones independientes (spec sección 9 — "ser socio" y
 * "pertenecer a una agencia" NO son lo mismo):
 *   1) `user.agencia` (pertenencia válida a una Agencia Ciudadan)
 *   2) rol `socio` (o `admin`) en `user.roles.extra`
 * Si falta alguna, responde `ok:false` con `reason` para que el frontend muestre
 * el placeholder "Abre tu Agencia" — sin inventar datos.
 */

const USER_UID = 'plugin::users-permissions.user';
const TODO_UID = 'api::todo.todo';

// `admin` se acepta además de `socio` porque la ruta core POST /api/todos ya
// autoriza a ambos a publicar tareas (src/api/todo/routes/todo.js).
const ROLES_PUBLICADORES = ['socio', 'admin'];

// Tope defensivo: el listado es "mis tareas publicadas", no un explorador.
const MAX_TODOS = 200;

const mapAgencia = (agencia) =>
  agencia ? { id: agencia.id, nombre: agencia.nombre || null } : null;

/**
 * Sólo se expone lo que la pantalla necesita (spec sección 13: "no exponer más
 * información de la necesaria"). Se omiten campos internos del todo como
 * `algoritmo`, `oraculos_validadores`, `anotaciones` o `enlaces`.
 */
const mapTodo = (todo) => ({
  id: todo.id,
  titulo: todo.titulo || '',
  descripcion: todo.descripcion || '',
  status: todo.status || null,
  nivel: todo.nivel || null,
  tipo: todo.tipo || null,
  recurrencia: todo.recurrencia || null,
  recompensa: todo.recompensa ?? null,
  reward_laborys: todo.reward_laborys ?? null,
  reward_cash: todo.reward_cash ?? null,
  minutos_desarrollo: todo.minutos_desarrollo ?? null,
  fecha_publicacion: todo.fecha_publicacion || null,
  fecha_entrega: todo.fecha_entrega || null,
  createdAt: todo.createdAt || null,
  updatedAt: todo.updatedAt || null,
  agencia: mapAgencia(todo.agencia),
  areas: Array.isArray(todo.areas)
    ? todo.areas.map((area) => ({ id: area.id, name: area.name || area.nombre || null }))
    : [],
  skills: Array.isArray(todo.skills)
    ? todo.skills.map((skill) => ({ id: skill.id, name: skill.name || null }))
    : [],
});

module.exports = {
  async misPublicadas(ctx) {
    const caller = await strapi.db.query(USER_UID).findOne({
      where: { id: ctx.state.strapiUser.id },
      populate: { agencia: true },
    });

    if (!caller) return ctx.unauthorized('No autenticado');

    const extra = Array.isArray(caller.roles?.extra) ? caller.roles.extra : [];
    const rolPublicador = extra.some((rol) => ROLES_PUBLICADORES.includes(rol));
    const agencia = caller.agencia || null;

    const meta = {
      rolPublicador,
      tieneAgencia: Boolean(agencia),
      agencia: mapAgencia(agencia),
    };

    // Sin agencia → la pantalla muestra "Abre tu Agencia Ciudadan".
    if (!agencia) {
      ctx.body = { ok: false, reason: 'sin-agencia', meta: { ...meta, total: 0 }, data: [] };
      return;
    }

    // Con agencia pero sin rol de publicador → no administra TodoToken.
    if (!rolPublicador) {
      ctx.body = { ok: false, reason: 'sin-rol-socio', meta: { ...meta, total: 0 }, data: [] };
      return;
    }

    const todos = await strapi.db.query(TODO_UID).findMany({
      where: {
        creador: caller.id,
        status: 'publicada',
      },
      populate: { agencia: true, areas: true, skills: true },
      orderBy: { createdAt: 'desc' },
      limit: MAX_TODOS,
    });

    // El criterio del spec es `agencia del usuario actual`. OJO (limitación real
    // del modelo actual, no un invento): `todo.agencia` sólo se setea cuando el
    // todo se asigna a una agencia (useTodos.assignToAgency → status 'asignada'),
    // mientras que los todos publicados desde el formulario "Agregar tarea"
    // nacen con `agencia = null`. Por eso se conservan los propios que aún no
    // tienen agencia etiquetada: el aislamiento entre socios lo garantiza
    // `creador = usuario autenticado`, y desde esta iteración el formulario sí
    // etiqueta la agencia del socio al publicar.
    const propios = todos.filter(
      (todo) => !todo.agencia || Number(todo.agencia.id) === Number(agencia.id)
    );

    ctx.body = {
      ok: true,
      reason: null,
      meta: { ...meta, total: propios.length },
      data: propios.map(mapTodo),
    };
  },
};

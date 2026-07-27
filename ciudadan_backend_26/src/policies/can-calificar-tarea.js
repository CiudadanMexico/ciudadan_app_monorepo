'use strict';

const axios = require('axios');

/**
 * Policy: can-calificar-tarea
 *
 * Decide si el usuario autenticado (Auth0) puede calificar una `tarea`
 * concreta, según el spec de permisos por tipo de tarea y tipo de agencia:
 *
 * ── Mismas agencias (reviewer y tarea en la misma agencia) ──
 *  • Tareas generales (todo.nivel = 'general'|'becario'):
 *      - califican: todos los socios de ESA agencia.
 *      - resuelven: cualquier usuario.
 *  • Tareas especializadas sin asignar (nivel 'especialidad'|'experto',
 *    sin asignado_a):
 *      - califican: todos los socios del ÁREA de la tarea (de toda la red).
 *      - resuelven: cualquier usuario con esa especialidad.
 *  • Tareas asignadas (nivel 'personalizada' O con asignado_a):
 *      - califica: SOLAMENTE quien la asignó (todo.asignador).
 *      - resuelve: el usuario asignado (todo.asignado_a).
 *
 * ── Agencias Federales (agencia.tipo = 'federal') ──
 *  • Pueden calificar TODAS las tareas generales de toda la red
 *    (todas las agencias).
 *  • Pueden calificar todas las tareas de su área (socio de área de
 *    toda la red) — aplica a especializadas de cualquier agencia
 *    cuyo área coincida con un área del reviewer.
 *
 * ── Admin ──
 *  • admin siempre puede calificar (bypass total).
 *
 * El reviewer se resuelve vía Auth0 /userinfo (mismo patrón que
 * is-admin-or-socio.js) y se deja en ctx.state.strapiUser.
 *
 * Se espera que el controller `calificar.js` haya validado `tareaId`
 * en el body ANTES de que corra esta policy. Como las policies de
 * Strapi corren antes del controller, esta policy lee `tareaId` del
 * body y carga la tarea+todo aquí; el controller reutiliza
 * ctx.state._calificarContext para no duplicar queries.
 */
module.exports = async (ctx, config, { strapi }) => {
  const authHeader = ctx.request.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    strapi.log.warn('can-calificar-tarea: falta el header Authorization');
    return false;
  }
  const token = authHeader.slice(7);
  const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
  if (!AUTH0_DOMAIN) {
    strapi.log.error('can-calificar-tarea: falta AUTH0_DOMAIN en el .env');
    return false;
  }

  // 1. Resolver reviewer vía Auth0.
  let email;
  try {
    const { data } = await axios.get(`https://${AUTH0_DOMAIN}/userinfo`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    email = data.email;
  } catch (err) {
    strapi.log.warn('can-calificar-tarea: token inválido en Auth0', err.response?.data || err.message);
    return false;
  }
  if (!email) {
    strapi.log.warn('can-calificar-tarea: Auth0 no devolvió email');
    return false;
  }

  // 2. Cargar reviewer con agencia y áreas verificadas.
  const reviewer = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { email },
    populate: { agencia: true, areas: true },
  });
  if (!reviewer) {
    strapi.log.warn(`can-calificar-tarea: no existe usuario en Strapi con email ${email}`);
    return false;
  }

  const extra = Array.isArray(reviewer.roles?.extra) ? reviewer.roles.extra : [];
  const isAdmin = extra.includes('admin');
  const isSocio = extra.includes('socio');

  // Exponer reviewer al controller.
  ctx.state.strapiUser = reviewer;

  // Admin: bypass total.
  if (isAdmin) return true;

  // Sin rol socio no puede calificar nada (excepto admin, ya cubierto).
  if (!isSocio) {
    strapi.log.warn(`can-calificar-tarea: ${email} no es socio ni admin`);
    return false;
  }

  // 3. Cargar la tarea + todo + agencia + áreas del todo.
  const { tareaId } = ctx.request.body || {};
  if (!tareaId) {
    strapi.log.warn('can-calificar-tarea: falta tareaId en el body');
    return false;
  }

  const tarea = await strapi.entityService.findOne('api::tarea.tarea', tareaId, {
    populate: { todo: { populate: { agencia: true, areas: true, asignador: true, asignado_a: true } } },
  });
  if (!tarea) {
    strapi.log.warn(`can-calificar-tarea: no existe tarea ${tareaId}`);
    return false;
  }
  if (!tarea.todo) {
    strapi.log.warn(`can-calificar-tarea: la tarea ${tareaId} no tiene todo`);
    return false;
  }

  const todo = tarea.todo;
  const todoAgencia = todo.agencia || null;
  const todoAreas = Array.isArray(todo.areas) ? todo.areas : [];
  const nivel = todo.nivel || 'general';
  const esAsignada = !!todo.asignado_a || nivel === 'personalizada';

  // Cachea contexto para que el controller no recargue todo.
  ctx.state._calificarContext = { tarea, todo, reviewer };

  // 4. Agencia federal del reviewer.
  const reviewerAgencia = reviewer.agencia || null;
  const reviewerEsFederal = reviewerAgencia?.tipo === 'federal';
  const reviewerAreaIds = (reviewer.areas || []).map((a) => (typeof a === 'object' ? a.id : a));

  // 5. Tareas ASIGNADAS: solo quien asignó califica.
  if (esAsignada) {
    const asignadorId = todo.asignador?.id || null;
    if (!asignadorId) {
      // Tarea asignada sin asignador registrado: nadie (salvo admin) califica.
      strapi.log.warn(`can-calificar-tarea: tarea ${tareaId} asignada sin asignador`);
      return false;
    }
    if (Number(reviewer.id) !== Number(asignadorId)) {
      strapi.log.warn(`can-calificar-tarea: ${email} no es el asignador de la tarea ${tareaId}`);
      return false;
    }
    return true;
  }

  // 6. Tareas GENERALES (nivel general|becario).
  const NIVELES_GENERAL = ['general', 'becario'];
  if (NIVELES_GENERAL.includes(nivel)) {
    // Agencia federal: califica todas las generales de toda la red.
    if (reviewerEsFederal) return true;

    // Socio de misma agencia: califica las generales de su agencia.
    if (todoAgencia && reviewerAgencia && Number(todoAgencia.id) === Number(reviewerAgencia.id)) {
      return true;
    }
    strapi.log.warn(`can-calificar-tarea: ${email} no es de la agencia de la tarea general ${tareaId}`);
    return false;
  }

  // 7. Tareas ESPECIALIZADAS (nivel especialidad|experto, sin asignar).
  //    Califican: socios del ÁREA de la tarea (de toda la red).
  //    Agencias federales: socio de área de toda la red → mismo check.
  if (todoAreas.length === 0) {
    strapi.log.warn(`can-calificar-tarea: tarea especializada ${tareaId} sin áreas`);
    return false;
  }
  const todoAreaIds = todoAreas.map((a) => (typeof a === 'object' ? a.id : a));
  const areaCoincide = todoAreaIds.some((aid) => reviewerAreaIds.includes(Number(aid)));
  if (!areaCoincide) {
    strapi.log.warn(
      `can-calificar-tarea: ${email} no es socio del área de la tarea especializada ${tareaId}`
    );
    return false;
  }
  return true;
};

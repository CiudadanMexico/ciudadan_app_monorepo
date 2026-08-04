'use strict';

const { getAuth0Email } = require('../utils/auth0-verify');

/**
 * Policy: can-asignar-tarea
 *
 * Decide si el usuario autenticado (Auth0) puede asignar un `todo` a uno o
 * varios usuarios, y valida que CADA usuario destino sea asignable según las
 * reglas de la Fase 6 del spec (README_logica_cowork.md):
 *
 * ── ¿Quién puede asignar? ──
 *  • admin: bypass total.
 *  • socio: solo puede asignar los `todo` que él mismo creó
 *    (`todo.creador.id === reviewer.id` o `todo.created_by.id === reviewer.id`).
 *    (Spec Fase 6: "Muestra únicamente las tareas con asignable=true creadas
 *    por el socio en sesión".)
 *
 * ── ¿A QUIÉN se le puede asignar? (4 casos) ──
 *  La matriz agencia-del-asignador × tipo-de-tarea:
 *
 *  | Agencia socio | Tipo tarea   | A quién se asigna                          |
 *  |---------------|--------------|--------------------------------------------|
 *  | Local         | General      | Usuarios de ESA agencia                    |
 *  | Local         | Especializada| Usuarios de ESA agencia Y de ESA área      |
 *  | Federal       | General      | Todos los usuarios de la red               |
 *  | Federal       | Especializada| Usuarios de toda la red con ESA área       |
 *
 *  Donde "tipo de tarea" se infiere del `todo.nivel`:
 *    - general | becario            → General
 *    - especialidad | experto        → Especializada (filtra por área del todo)
 *    - personalizada (o con asignado_a) → Especializada si tiene áreas, si no
 *                                          se trata como general. (Las
 *                                          "asignadas" ya tienen un asignador
 *                                          fijo; re-asignar sigue las reglas
 *                                          del tipo base.)
 *
 * El reviewer se resuelve vía Auth0 /userinfo (mismo patrón que
 * can-calificar-tarea.js) y se deja en ctx.state.strapiUser.
 *
 * Body esperado:
 *   { todoId: number, userIds: number[] }
 *
 * Cachea el contexto validado en ctx.state._asignarContext para que el
 * controller no recargue el todo ni los usuarios.
 */
module.exports = async (ctx, config, { strapi }) => {
  const authHeader = ctx.request.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    strapi.log.warn('can-asignar-tarea: falta el header Authorization');
    return false;
  }
  const token = authHeader.slice(7);

  // 1. Resolver asignador vía Auth0 (cacheado, ver utils/auth0-verify.js).
  let email;
  try {
    email = await getAuth0Email(token, { strapi });
  } catch (err) {
    strapi.log.warn('can-asignar-tarea: token inválido en Auth0', err.response?.data || err.message);
    return false;
  }

  // 2. Cargar asignador con agencia y áreas.
  const asignador = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { email },
    populate: { agencia: true, areas: true },
  });
  if (!asignador) {
    strapi.log.warn(`can-asignar-tarea: no existe usuario en Strapi con email ${email}`);
    return false;
  }

  const extra = Array.isArray(asignador.roles?.extra) ? asignador.roles.extra : [];
  const isAdmin = extra.includes('admin');
  const isSocio = extra.includes('socio');

  // Exponer asignador al controller.
  ctx.state.strapiUser = asignador;

  // Solo admin o socio pueden asignar.
  if (!isAdmin && !isSocio) {
    strapi.log.warn(`can-asignar-tarea: ${email} no es socio ni admin`);
    return false;
  }

  // 3. Validar body.
  const { todoId, userIds } = ctx.request.body || {};
  if (!todoId) {
    strapi.log.warn('can-asignar-tarea: falta todoId en el body');
    return false;
  }
  const ids = Array.isArray(userIds) ? userIds.map((id) => Number(id)).filter(Boolean) : [];
  if (ids.length === 0) {
    strapi.log.warn('can-asignar-tarea: userIds vacío o inválido');
    return false;
  }

  // 4. Cargar el todo con agencia, áreas, creador y created_by.
  const todo = await strapi.entityService.findOne('api::todo.todo', todoId, {
    populate: { agencia: true, areas: true, creador: true, created_by: true, asignador: true, asignado_a: true },
  });
  if (!todo) {
    strapi.log.warn(`can-asignar-tarea: no existe todo ${todoId}`);
    return false;
  }

  // 5. Socio (no admin): solo puede asignar los todo que él creó.
  if (!isAdmin) {
    const creadorId = todo.creador?.id || todo.created_by?.id || null;
    if (!creadorId || Number(asignador.id) !== Number(creadorId)) {
      strapi.log.warn(
        `can-asignar-tarea: ${email} no es el creador del todo ${todoId} (creador=${creadorId})`
      );
      return false;
    }
  }

  // 6. Determinar tipo de tarea (general vs especializada) a partir del nivel.
  const nivel = todo.nivel || 'general';
  const NIVELES_GENERAL = ['general', 'becario'];
  const NIVELES_ESPECIALIZADA = ['especialidad', 'experto', 'personalizada'];
  const esEspecializada =
    NIVELES_ESPECIALIZADA.includes(nivel) && Array.isArray(todo.areas) && todo.areas.length > 0;

  const asignadorAgencia = asignador.agencia || null;
  const asignadorEsFederal = asignadorAgencia?.tipo === 'federal';
  const todoAreaIds = (todo.areas || []).map((a) => (typeof a === 'object' ? a.id : a));

  // 7. Cargar los usuarios destino con su agencia y áreas.
  const usuarios = await strapi.db.query('plugin::users-permissions.user').findMany({
    where: { id: { $in: ids } },
    populate: { agencia: true, areas: true },
  });

  if (usuarios.length !== ids.length) {
    strapi.log.warn(
      `can-asignar-tarea: algunos userIds no existen (pedidos ${ids.length}, encontrados ${usuarios.length})`
    );
    return false;
  }

  // 8. Validar cada usuario destino contra la matriz de la Fase 6.
  const rechazados = [];
  for (const u of usuarios) {
    const uAgencia = u.agencia || null;

    // (a) Filtro por agencia: local → misma agencia; federal → cualquiera.
    if (!asignadorEsFederal) {
      const mismaAgencia = uAgencia && asignadorAgencia && Number(uAgencia.id) === Number(asignadorAgencia.id);
      if (!mismaAgencia) {
        rechazados.push({ id: u.id, username: u.username, motivo: 'no pertenece a la agencia del socio (local)' });
        continue;
      }
    }

    // (b) Filtro por área si la tarea es especializada.
    if (esEspecializada) {
      const uAreaIds = (u.areas || []).map((a) => (typeof a === 'object' ? a.id : a));
      const areaCoincide = todoAreaIds.some((aid) => uAreaIds.includes(Number(aid)));
      if (!areaCoincide) {
        rechazados.push({ id: u.id, username: u.username, motivo: 'no pertenece al área de la tarea especializada' });
        continue;
      }
    }
  }

  if (rechazados.length > 0) {
    strapi.log.warn(
      `can-asignar-tarea: usuarios rechazados por la matriz de asignación: ${JSON.stringify(rechazados)}`
    );
    // Devolvemos 403 con el detalle para que el frontend pueda mostrar el motivo.
    ctx.response.status = 403;
    ctx.response.body = {
      statusCode: 403,
      error: 'Forbidden',
      message: 'Algunos usuarios no son asignables según las reglas de agencia/área',
      rechazados,
    };
    return false;
  }

  // 9. Cachea contexto para el controller.
  ctx.state._asignarContext = { todo, usuarios, asignador, esEspecializada };
  return true;
};

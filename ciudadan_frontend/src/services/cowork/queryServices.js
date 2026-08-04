import { fetchJson, STRAPI_URL } from '../../utils/request.utils';

const authHeaders = (token) => (token ? { headers: { Authorization: `Bearer ${token}` } } : {});

export const getUserAreas = (userId, token = null) => {
  if (!userId) return Promise.resolve(null);
  return fetchJson(
    `${STRAPI_URL}/api/users/${userId}/areas`,
    authHeaders(token),
    'No se pudieron cargar las areas del usuario'
  );
};

export const getSpecializedTodos = (token = null) =>
  fetchJson(
    `${STRAPI_URL}/api/todos?populate[areas]=*&populate[subareas]=*&pagination[limit]=1000&sort[0]=id:desc`,
    authHeaders(token),
    'No se pudieron cargar las tareas especializadas'
  );

export const getAllTasksWithUsers = (token = null) =>
  fetchJson(
    `${STRAPI_URL}/api/tareas?populate[usuario]=*&populate[todo]=*&pagination[limit]=10000`,
    authHeaders(token),
    'No se pudieron cargar las tareas existentes'
  );

export const getGeneralTodos = (token = null) =>
  fetchJson(
    `${STRAPI_URL}/api/todos?pagination[limit]=1000&sort[0]=id:desc`,
    authHeaders(token),
    'No se pudieron cargar las tareas generales'
  );

export const getAvailableRootAreas = (token = null) =>
  fetchJson(
    `${STRAPI_URL}/api/areas?filters[level][$eq]=0&pagination[limit]=1000&sort[0]=name:asc`,
    authHeaders(token),
    'No se pudieron cargar las areas disponibles'
  );

// Tareas pendientes de calificación (status=completada) — para admin/socio.
export const getTareasPendientesCalificacion = (token = null) =>
  fetchJson(
    `${STRAPI_URL}/api/tareas?filters[status][$eq]=completada&populate[usuario]=*&populate[todo]=*&pagination[limit]=1000&sort[0]=id:desc`,
    authHeaders(token),
    'No se pudieron cargar las tareas pendientes de calificación'
  );

// Tareas enviadas a corrección (status=corregir) — para verificador/admin.
export const getTareasParaCorregir = (token = null) =>
  fetchJson(
    `${STRAPI_URL}/api/tareas?filters[status][$eq]=corregir&populate[usuario]=*&populate[todo]=*&pagination[limit]=1000&sort[0]=id:desc`,
    authHeaders(token),
    'No se pudieron cargar las tareas para corregir'
  );

// Tareas apeladas por el usuario — para admin/socio revisión.
// El estado `apelada` NO existe en el enum tarea.status; el controller
// `apelar.js` deja la tarea en su estado (típicamente calificada/pagada) e
// inserta una entry en `apelaciones` (campo JSON). Filtramos por
// `apelaciones` no nulo para obtener las que tienen al menos una apelación.
export const getTareasApeladas = (token = null) =>
  fetchJson(
    `${STRAPI_URL}/api/tareas?filters[apelaciones][$notNull]=true&populate[usuario]=*&populate[todo]=*&pagination[limit]=1000&sort[0]=id:desc`,
    authHeaders(token),
    'No se pudieron cargar las tareas apeladas'
  );

// Tareas de un usuario específico (historial completo).
//
// OJO: NO usar `/api/tareas?filters[usuario][id][$eq]=...` — `find`/`findOne`
// de `tarea` (y de `todo`) tienen `auth: false` en sus rutas (para que las
// tareas generales sean públicas, spec documento-off.md:32-35). Eso hace que
// Strapi nunca resuelva `ctx.state.auth`, y el validador interno de filtros
// por relación (`throwRestrictedRelations`) lo necesita para autorizar
// `filters[<relación>]`, así que CUALQUIER filtro por relación en `todos` o
// `tareas` responde 400 "Invalid parameter", con o sin sesión. Se reproduce
// igual con `usuario`, `todo`, `reviewed_by`, `areas`, `creador` — no es algo
// específico de este campo. El endpoint dedicado `/tareas/filtrar` no tiene
// este problema porque filtra con `strapi.entityService` (bypassa el
// validador REST) y además ya trae el ACL correcto (usuarioId).
export const getTareasByUsuario = (userId, token = null) => {
  if (!userId) return Promise.resolve({ data: [] });
  return fetchJson(
    `${STRAPI_URL}/api/tareas/filtrar?usuarioId=${userId}&pageSize=100`,
    authHeaders(token),
    'No se pudieron cargar las tareas del usuario'
  );
};

// Cartera del usuario autenticado.
export const getCartera = (token = null) =>
  fetchJson(
    `${STRAPI_URL}/api/cartera`,
    authHeaders(token),
    'No se pudo cargar la cartera'
  );

// Lista de agencias (para el selector del formulario "Agregar socio").
export const getAgencias = (token = null) =>
  fetchJson(
    `${STRAPI_URL}/api/agencias?pagination[limit]=100&sort[0]=nombre:asc`,
    authHeaders(token),
    'No se pudieron cargar las agencias'
  );

// Todos con asignable=true (Fase 5/6) — el filtro por "creados por el socio
// en sesión" se aplica en el frontend (AsignarTareaPage) porque admin ve todas.
export const getTodosAsignables = (token = null) =>
  fetchJson(
    `${STRAPI_URL}/api/todos?filters[asignable][$eq]=true&populate[areas]=*&populate[creador]=*&populate[created_by]=*&populate[asignado_a]=*&populate[asignador]=*&pagination[limit]=1000&sort[0]=id:desc`,
    authHeaders(token),
    'No se pudieron cargar las tareas asignables'
  );

// Usuarios de la red con agencia y áreas populadas — usado por
// useAutocompletarAsignacion para filtrar candidatos (Fase 6).
// Nota: sin filtro server-side por volumen; ver README_logica_cowork.md
// Fase 6 (el caso "federal" idealmente usaría búsqueda por nombre/correo en
// el backend en vez de traer la red completa; queda como mejora futura).
export const getUsuariosRed = (token = null) =>
  fetchJson(
    `${STRAPI_URL}/api/users?populate=agencia,areas&pagination[limit]=2000`,
    authHeaders(token),
    'No se pudieron cargar los usuarios'
  );

// Tareas (resoluciones) activas de un todo — usado por "Asignar tarea" para
// mostrar/editar quién ya está asignado. Usa /tareas/filtrar (no el filtro
// REST directo, roto para relaciones en todo/tarea — ver nota en
// getTareasByUsuario más arriba).
export const getTareasByTodo = (todoId, token = null) => {
  if (!todoId) return Promise.resolve({ data: [] });
  return fetchJson(
    `${STRAPI_URL}/api/tareas/filtrar?todoId=${todoId}&pageSize=100`,
    authHeaders(token),
    'No se pudieron cargar los usuarios ya asignados'
  );
};

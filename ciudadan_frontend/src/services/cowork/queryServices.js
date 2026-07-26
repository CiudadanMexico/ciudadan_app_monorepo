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
export const getTareasByUsuario = (userId, token = null) => {
  if (!userId) return Promise.resolve({ data: [] });
  return fetchJson(
    `${STRAPI_URL}/api/tareas?filters[usuario][id][$eq]=${userId}&populate[usuario]=*&populate[todo]=*&pagination[limit]=1000&sort[0]=id:desc`,
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

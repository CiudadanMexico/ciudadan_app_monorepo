import { fetchJson, STRAPI_URL } from '../../utils/request.utils';

export const getUserAreas = (userId) => {
  if (!userId) return Promise.resolve(null);
  return fetchJson(
    `${STRAPI_URL}/api/users/${userId}?populate=areas`,
    {},
    'No se pudieron cargar las areas del usuario'
  );
};

export const getSpecializedTodos = () =>
  fetchJson(
    `${STRAPI_URL}/api/todos?populate[areas]=*&populate[subareas]=*&pagination[limit]=1000&sort[0]=id:desc`,
    {},
    'No se pudieron cargar las tareas especializadas'
  );

export const getAllTasksWithUsers = () =>
  fetchJson(
    `${STRAPI_URL}/api/tareas?populate[usuario]=*&populate[todo]=*&pagination[limit]=10000`,
    {},
    'No se pudieron cargar las tareas existentes'
  );

export const getGeneralTodos = () =>
  fetchJson(
    `${STRAPI_URL}/api/todos?pagination[limit]=1000&sort[0]=id:desc`,
    {},
    'No se pudieron cargar las tareas generales'
  );

export const getAvailableRootAreas = () =>
  fetchJson(
    `${STRAPI_URL}/api/areas?filters[nivel][$eq]=0&pagination[limit]=1000&sort[0]=nombre:asc`,
    {},
    'No se pudieron cargar las areas disponibles'
  );

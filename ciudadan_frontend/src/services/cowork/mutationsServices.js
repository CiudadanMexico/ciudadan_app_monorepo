import { fetchJson, STRAPI_URL } from '../../utils/request.utils';

export const createTask = (userId, todoId) => {
  if (!userId) return Promise.reject(new Error('Usuario invalido'));
  if (!todoId) return Promise.reject(new Error('Tarea invalida'));

  return fetchJson(
    `${STRAPI_URL}/api/tareas`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          usuario: userId,
          todo: todoId,
          tipo: 'tarea',
        },
      }),
    },
    'No se pudo asignar la tarea'
  );
};

export const updateTodoStatus = (todoId, status) => {
  if (!todoId) return Promise.reject(new Error('Todo invalido'));

  return fetchJson(
    `${STRAPI_URL}/api/todos/${todoId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: { status },
      }),
    },
    'No se pudo actualizar el estado de la tarea'
  );
};

export const assignUserAreas = (userId, areaIds) => {
  if (!userId) return Promise.reject(new Error('Usuario invalido'));

  return fetchJson(
    `${STRAPI_URL}/api/users/${userId}/areas`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ areaIds }),
    },
    'No se pudieron asignar las areas'
  );
};

import { useState, useEffect, useCallback } from 'react';
import { getAllTasksWithUsers } from '../services/cowork/queryServices';
import { canUserTakeTask } from '../utils/cowork.helpers';

export function useRecurrenciaValidation() {
  const [existingTasks, setExistingTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchExistingTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const json = await getAllTasksWithUsers();
      const tasks = (json.data || []).map((item) => {
        const attrs = item.attributes || item;
        const todoData = attrs.todo?.data || attrs.todo || {};
        const usuarioData = attrs.usuario?.data || attrs.usuario || {};
        return {
          id: item.id,
          todo: { id: todoData.id },
          usuario: { id: usuarioData.id },
        };
      });
      setExistingTasks(tasks);
    } catch (err) {
      console.error('Error cargando tareas existentes:', err);
      setError('No se pudieron cargar las tareas existentes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExistingTasks();
  }, [fetchExistingTasks]);

  const checkCanTake = useCallback(
    (todo, userId) => canUserTakeTask(todo, userId, existingTasks),
    [existingTasks]
  );

  return { loading, error, canUserTakeTask: checkCanTake, refetch: fetchExistingTasks };
}

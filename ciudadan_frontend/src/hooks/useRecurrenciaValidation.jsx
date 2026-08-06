import { useState, useEffect, useCallback, useMemo } from 'react';
import { getAllTasksWithUsers } from '../services/cowork/queryServices';
import { canUserTakeTask } from '../utils/cowork.helpers';
import { getVerifiedAreas } from '../utils/cowork/areaVerification';

/**
 * Hook para validar si el usuario puede tomar (resolver) un todo.
 *
 * Combina dos chequeos:
 *   1. Recurrencia (lógica existente): si la tarea es única y ya fue tomada,
 *      o si el usuario ya la tomó en una tarea periódica.
 *   2. Visibilidad por área/skill (spec documento-off.md l.34): las tareas
 *      especializadas solo se pueden tomar si el usuario tiene área/subárea
 *      o habilidad verificada coincidente. Admin/socio bypass.
 *
 * Parámetros:
 *   userData — objeto del usuario del RolesContext ({ id, roles, role, areas,
 *              area_details, skills }). Opcional: si no se pasa, sólo se
 *              aplica la validación de recurrencia (compat con callers viejos;
 *              el backend validates igual con 403).
 */
export function useRecurrenciaValidation(userData) {
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
          status: attrs.status,
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

  // Pre-cálculo del contexto de visibilidad del usuario. Si userData cambia
  // poco (id estable), esto es estable entre renders.
  const userContext = useMemo(() => {
    if (!userData) return undefined;
    const rolesExtra = Array.isArray(userData.roles?.extra) ? userData.roles.extra : [];
    const isPrivileged =
      rolesExtra.includes('admin') ||
      rolesExtra.includes('socio') ||
      userData.role?.name === 'Admin' ||
      userData.role?.name === 'Socio';

    // Áreas verificadas: union de area_details verified + areas asociadas
    // cuyo area_details está vacío o verified (igual que el backend).
    const fromDetails = (getVerifiedAreas(userData) || []).map((a) => Number(a.id));
    const fromRelations = (userData.areas || [])
      .map((a) => (typeof a === 'object' ? a.id : Number(a)))
      .filter((id) => id && !Number.isNaN(id))
      .filter((id) => {
        const details = userData.area_details?.[id];
        return !details || details.status === 'verified';
      });
    const verifiedAreaIds = Array.from(new Set([...fromDetails, ...fromRelations]));

    const verifiedSkillIds = (userData.skills || [])
      .map((s) => (typeof s === 'object' ? s.id : Number(s)))
      .filter((id) => id && !Number.isNaN(id));

    return { isPrivileged, verifiedAreaIds, verifiedSkillIds };
  }, [userData]);

  const checkCanTake = useCallback(
    (todo, userId) => canUserTakeTask(todo, userId, existingTasks, userContext),
    [existingTasks, userContext]
  );

  return { loading, error, canUserTakeTask: checkCanTake, refetch: fetchExistingTasks };
}

export const getAttributes = (item) => item?.attributes || item || {};

export const normalizeAreas = (relation) => {
  const value = relation?.data ?? relation ?? [];
  let items = [];

  if (Array.isArray(value)) {
    items = value;
  } else if (value) {
    items = [value];
  }

  return items
    .map((item) => {
      const attrs = getAttributes(item);

      return {
        id: item?.id ?? attrs.id,
        nombre: attrs.nombre || 'Sin nombre',
        nivel: Number(attrs.nivel ?? 0),
        isActive: (attrs.is_active ?? attrs.isActive) !== false,
      };
    })
    .filter((area) => area.id);
};

export const getActiveRootAreas = (areas = []) =>
  normalizeAreas(areas).filter((area) => area.isActive && area.nivel === 0);

export const normalizeTask = (item) => {
  const attrs = getAttributes(item);

  return {
    id: item.id,
    titulo: attrs.titulo || 'Sin título',
    descripcion: attrs.descripcion || 'Sin descripción',
    tiempoMin: attrs.minutos_desarrollo || 0,
    labory: attrs.recompensa ?? attrs.pagos_laborys ?? 0,
    efectivo: attrs.pagos_efectivo || 0,
    fechaEntrega: attrs.fecha_entrega || null,
    status: attrs.status,
    recurrencia: attrs.recurrencia,
    areas: normalizeAreas(attrs.areas),
    subareas: normalizeAreas(attrs.subareas),
  };
};

export const uniqueById = (items) => {
  const seen = new Set();

  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

export const buildAreaHierarchy = (areas, tasks) =>
  areas
    .filter((area) => area.nivel === 0 && area.isActive)
    .map((area) => {
      const areaTasks = uniqueById(
        tasks.filter((task) => task.areas.some((taskArea) => taskArea.id === area.id))
      );
      const subareaMap = new Map();
      const directTasks = [];

      areaTasks.forEach((task) => {
        const taskSubareas = task.subareas.filter((subarea) => subarea.id !== area.id);

        if (taskSubareas.length === 0) {
          directTasks.push(task);
          return;
        }

        taskSubareas.forEach((subarea) => {
          const current = subareaMap.get(subarea.id) || {
            ...subarea,
            tasks: [],
          };

          current.tasks = uniqueById([...current.tasks, task]);
          subareaMap.set(subarea.id, current);
        });
      });

      return {
        ...area,
        directTasks: uniqueById(directTasks),
        subareas: Array.from(subareaMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)),
        totalTasks: areaTasks.length,
      };
    });

export const parseAreaSelectValue = (value) =>
  typeof value === 'string' ? value.split(',').map(Number) : value;

export const canUserTakeTask = (todo, userId, existingTasks) => {
  const recurrencia = todo.recurrencia ?? 'unica';
  const tasksForTodo = existingTasks.filter((t) => t.todo?.id === todo.id);

  if (recurrencia === 'unica') {
    return tasksForTodo.length === 0;
  }

  return !tasksForTodo.some((t) => t.usuario?.id === userId);
};

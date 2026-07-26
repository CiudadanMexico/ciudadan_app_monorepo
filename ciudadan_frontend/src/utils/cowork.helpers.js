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
        name: attrs.name || attrs.nombre || 'Sin nombre',
        level: Number(attrs.level ?? attrs.nivel ?? 0),
        isActive: (attrs.is_active ?? attrs.isActive) !== false,
      };
    })
    .filter((area) => area.id);
};

export const getActiveRootAreas = (areas = []) =>
  normalizeAreas(areas).filter((area) => area.isActive && area.level === 0);

export const getSkillsForUser = (user) => {
  if (!user?.skills?.data) return [];
  return user.skills.data.map(skill => ({
    id: skill.id,
    name: skill.attributes.name,
    description: skill.attributes.description
  }));
};

export const normalizeTask = (item) => {
  const attrs = getAttributes(item);

  return {
    id: item.id,
    titulo: attrs.titulo || 'Sin título',
    descripcion: attrs.descripcion || 'Sin descripción',
    tiempoMin: attrs.minutos_desarrollo || 0,
    labory: attrs.reward_laborys ?? attrs.recompensa ?? attrs.pagos_laborys ?? 0,
    efectivo: attrs.reward_cash ?? attrs.pagos_efectivo ?? 0,
    fechaEntrega: attrs.fecha_entrega || null,
    status: attrs.status,
    recurrencia: attrs.recurrencia,
    areas: normalizeAreas(attrs.areas),
    subareas: normalizeAreas(attrs.subareas),
    media: Array.isArray(attrs.media) ? attrs.media : [],
    skills: Array.isArray(attrs.skills?.data) ? attrs.skills.data.map(s => ({
      id: s.id,
      name: s.attributes.name
    })) : [],
    area_details: attrs.area_details || {},
    createdAt: attrs.createdAt || null,
    updatedAt: attrs.updatedAt || null
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

export const validateTaskStatusTransition = (from, to) => {
  const validTransitions = {
    'borrador': ['publicada', 'cancelada'],
    'publicada': ['asignada', 'cancelada'],
    'asignada': ['en_proceso', 'cancelada'],
    'en_proceso': ['pendiente_revision', 'cancelada'],
    'pendiente_revision': ['corregir'],
    'corregir': ['corregida'],
    'corregida': ['calificada'],
    'calificada': ['pagada'],
    'pagada': [],
    'cancelada': [],
    'modificada': ['publicada']
  };
  
  return validTransitions[from]?.includes(to) || false;
};

export const buildAreaHierarchy = (areas, tasks) =>
  areas
  .filter((area) => area.level === 0 && area.isActive)
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
      subareas: Array.from(subareaMap.values()).sort((a, b) => (a.name || a.nombre || '').localeCompare(b.name || b.nombre || '')),
      totalTasks: areaTasks.length,
      verifiedCount: areaTasks.filter(task => 
        task.area_details?.[area.id]?.status === 'verified'
      ).length
    };
  });

export const filterTasksBySkill = (tasks, skillId) => {
  return tasks.filter(task => 
    task.skills && task.skills.some(skill => skill.id === skillId)
  );
};

export const getTaskStatusColor = (status) => {
  const colors = {
    'borrador': '#888',
    'publicada': '#1890ff',
    'asignada': '#fa8c16',
    'en_proceso': '#13c2c2',
    'pendiente_revision': '#faad14',
    'corregir': '#fa8c16',
    'corregida': '#52c41a',
    'calificada': '#52c41a',
    'pagada': '#3f8600',
    'cancelada': '#ff4d4d',
    'modificada': '#1890ff'
  };
  return colors[status] || '#888';
};

// Spec Punto 7 — Mapeo del enum cerrado (snake_case) a etiquetas legibles
// en español capitalizadas. Pensado para UI: badges, tablas, tooltips.
//
// Cubre los 10 estados de `todo` (tarea original) + los 8 de `tarea`
// (resolución) + `completada` (resolución). Comparten varios estados;
// cuando un estado aplica a ambos, la etiqueta es la misma.
const STATUS_LABELS = {
  // Solo `todo` (tarea original)
  'borrador':            'Borrador',
  'publicada':           'Publicada',
  'asignada':            'Asignada',
  'pendiente_revision':  'Pendiente de revisión',
  // Comunes `todo` + `tarea`
  'en_proceso':          'En proceso',
  'corregir':            'Para corregir',
  'corregida':           'Corregida',
  'calificada':          'Calificada',
  'pagada':              'Pagada',
  'cancelada':           'Cancelada',
  // Solo `tarea` (resolución)
  'completada':          'Completada',
  'modificada':          'Modificada',
};

export const getTaskStatusLabel = (status) =>
  STATUS_LABELS[status] || (status ? String(status).replace(/_/g, ' ') : '—');

// Alias explícitos por entidad (auto-documenta la separación del spec 7.3).
// Misma tabla, pero la firma deja clara la intención del caller.
export const getTodoStatusLabel = getTaskStatusLabel;
export const getResolucionStatusLabel = getTaskStatusLabel;

export const parseAreaSelectValue = (value) =>
  typeof value === 'string' ? value.split(',').map(Number) : value;

export const canUserTakeTask = (todo, userId, existingTasks, userContext) => {
  // 1. Validación de recurrencia.
  //    - unica:  solo se puede tomar si NO hay ninguna tarea previa activa
  //              (es decir, no cancelada). Las canceladas no cuentan.
  //    - abierta/periodica/recurrente: el mismo usuario no puede tener otra
  //              tarea activa (no cancelada) para el mismo todo.
  const recurrencia = todo.recurrencia ?? 'unica';
  const tasksForTodo = existingTasks.filter((t) => t.todo?.id === todo.id);
  const activeTasks = tasksForTodo.filter((t) => t.status !== 'cancelada');

  let recurrenciaOk;
  if (recurrencia === 'unica') {
    recurrenciaOk = activeTasks.length === 0;
  } else {
    recurrenciaOk = !activeTasks.some(
      (t) => t.usuario?.id === userId
    );
  }
  if (!recurrenciaOk) return false;

  // 2. Validación de visibilidad por área/skill (spec documento-off.md l.34).
  //    Si no se pasa userContext (compat retroactiva) se omite este check:
  //    el backend igual lo valida y devolverá 403; el frontend sólo oculta
  //    el botón cuando puede decidir.
  if (!userContext) return true;

  // Admin/socio: bypass (mismo criterio que el backend)
  const { isPrivileged, verifiedAreaIds = [], verifiedSkillIds = [] } = userContext;
  if (isPrivileged) return true;

  const NIVELES_GENERAL = ['general', 'becarios', 'becario'];
  if (NIVELES_GENERAL.includes(todo.nivel)) return true;

  // Tarea especializada: debe coincidir con área/subárea o skill verificada.
  const todoAreas = [...(todo.areas || []), ...(todo.subareas || [])];
  const todoSkills = todo.skills || [];

  const areaMatch = todoAreas.some((a) => {
    const id = typeof a === 'object' ? a.id : Number(a);
    return verifiedAreaIds.includes(id);
  });
  const skillMatch = todoSkills.some((s) => {
    const id = typeof s === 'object' ? s.id : Number(s);
    return verifiedSkillIds.includes(id);
  });

  return areaMatch || skillMatch;
};

export const canUserVerifyArea = (user, areaId) => {
  // Solo verificadores pueden verificar áreas
  return user?.roles?.extra?.includes('verificador');
};

export const canUserRateTask = (task, userId) => {
  // Solo el creador o verificador puede calificar
  const isCreator = task?.creador?.id === userId;
  const isAdminOrVerificador = task?.usuario?.roles?.extra?.includes('admin') || 
                               task?.usuario?.roles?.extra?.includes('verificador');
  return isCreator || isAdminOrVerificador;
};

export const canUserPayTask = (task, userId) => {
  // Solo administradores o verificadores pueden pagar
  return task?.usuario?.roles?.extra?.includes('admin') || 
         task?.usuario?.roles?.extra?.includes('verificador');
};

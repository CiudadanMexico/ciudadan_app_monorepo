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
    labory: attrs.reward_laborys ?? attrs.recompensa ?? 0,
    efectivo: attrs.reward_cash ?? 0,
    fechaEntrega: attrs.fecha_entrega || null,
    status: attrs.status,
    nivel: attrs.nivel || null,
    recurrencia: attrs.recurrencia || null,
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

/**
 * buildAreaEntry — núcleo puro de un chip/entrada del panel: dada un área y
 * la lista de tareas, devuelve la entrada con sus tareas directas y su
 * agrupación por subáreas, en la misma forma que consume el panel
 * (name, totalTasks, directTasks, subareas, verifiedCount).
 *
 * Para un área RAÍZ se usa el agrupado por subáreas de toda la vida.
 * Para una SUBÁREA aprobada (level 1): no tiene sentido agrupar por debajo;
 * la entrada lleva las tareas que la referencian en `task.subareas` (o en
 * `task.areas`), con `subareas: []`.
 */
export const buildAreaEntry = (area, tasks) => {
  if (!area.level) {
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
  }

  const subareaTasks = uniqueById(
    tasks.filter(
      (task) =>
        task.subareas.some((taskSubarea) => taskSubarea.id === area.id) ||
        task.areas.some((taskArea) => taskArea.id === area.id)
    )
  );

  return {
    ...area,
    directTasks: subareaTasks,
    subareas: [],
    totalTasks: subareaTasks.length,
    verifiedCount: subareaTasks.filter(task =>
      task.area_details?.[area.id]?.status === 'verified'
    ).length
  };
};

export const buildAreaHierarchy = (areas, tasks) =>
  areas
    .filter((area) => area.level === 0 && area.isActive)
    .map((area) => buildAreaEntry(area, tasks));


/**
 * buildSkillChips — chips de especialidades del panel "Tareas especializadas".
 *
 * Entrada: las áreas asignadas al usuario (raíces level 0 y subáreas level 1
 * aprobadas), la lista de tareas ya normalizadas y el `area_details` del
 * usuario (para marcar las pendientes de verificación).
 *
 * Reglas:
 *  - solo áreas activas;
 *  - dedupe por slug del nombre: si conviven una raíz y una subárea con el
 *    mismo nombre ("administrativo" bajo "Administrativo"), gana la raíz;
 *  - orden estable: primero raíces por nombre, luego subáreas por nombre
 *    (así "la primera por defecto" es determinista);
 *  - cada chip lleva la misma forma que una entrada de hierarchy
 *    (name, totalTasks, directTasks, subareas, verifiedCount) más
 *    `pendiente`: true si area_details[id]?.status no es 'verified'.
 */
export const buildSkillChips = (areas = [], tasks = [], areaDetails = {}) => {
  const slugOf = (name) =>
    String(name || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '');

  const pendingOf = (details, areaId) => {
    if (!details || typeof details !== 'object') return false;
    const entry = details[String(areaId)] ?? details[areaId];
    if (!entry || typeof entry !== 'object') return false;
    const status = String(entry.status || '').toLowerCase();
    return status !== 'verified';
  };

  const activas = normalizeAreas(areas).filter((area) => area.isActive);
  const bySlug = new Map();
  for (const area of activas) {
    const slug = slugOf(area.name) || `id-${area.id}`;
    const prev = bySlug.get(slug);
    // Gana la raíz sobre la subárea cuando el nombre choca.
    if (!prev || (prev.level !== 0 && area.level === 0)) bySlug.set(slug, area);
  }

  const chips = Array.from(bySlug.values()).map((area) => {
    const entry = buildAreaEntry(area, tasks);
    return { ...entry, pendiente: pendingOf(areaDetails, area.id) };
  });

  chips.sort((a, b) => {
    if ((a.level === 0) !== (b.level === 0)) return a.level === 0 ? -1 : 1;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });

  return chips;
};

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

/**
 * canUserRateTask — ¿puede el usuario calificar esta tarea?
 *
 * Implementa el spec de permisos por tipo de tarea + tipo de agencia
 * (docs/documento-off.md / docs/COWORK-FILES.md L492-515):
 *
 *  • Tareas generales (todo.nivel = general|becario):
 *      - califican: todos los socios de ESA agencia.
 *      - agencias federales: califican todas las generales de toda la red.
 *  • Tareas especializadas sin asignar (nivel especialidad|experto,
 *    sin asignado_a):
 *      - califican: socios del ÁREA de la tarea (de toda la red).
 *  • Tareas asignadas (nivel personalizada O con asignado_a):
 *      - califica: SOLAMENTE quien la asignó (todo.asignador).
 *
 *  • admin: bypass total.
 *
 * @param {object} task  - la tarea (tarea) con su todo populado.
 * @param {object} user  - el usuario reviewer (de AuthContext/RolesContext),
 *                         con { id, roles.extra, agencia, areas }.
 * @returns {boolean}
 */
export const canUserRateTask = (task, user) => {
  if (!task || !user) return false;

  const extra = Array.isArray(user.roles?.extra) ? user.roles.extra : [];
  const isAdmin = extra.includes('admin');
  const isSocio = extra.includes('socio');

  // Admin: bypass total.
  if (isAdmin) return true;

  // Sin rol socio no califica nada (excepto admin).
  if (!isSocio) return false;

  const todo = task.todo?.data?.attributes || task.todo || {};
  const nivel = todo.nivel || 'general';
  const esAsignada = !!todo.asignado_a || nivel === 'personalizada';

  // --- Tareas ASIGNADAS: solo quien asignó califica ---
  if (esAsignada) {
    const asignadorId = todo.asignador?.data?.id || todo.asignador?.id || null;
    if (!asignadorId) return false;
    return Number(user.id) === Number(asignadorId);
  }

  const NIVELES_GENERAL = ['general', 'becario', 'becarios'];
  const todoAgencia = todo.agencia?.data?.attributes || todo.agencia || null;
  const todoAgenciaId = todoAgencia?.id || null;
  const reviewerAgencia = user.agencia?.data?.attributes || user.agencia || null;
  const reviewerEsFederal = reviewerAgencia?.tipo === 'federal';
  const reviewerAgenciaId = reviewerAgencia?.id || null;

  // --- Tareas GENERALES ---
  if (NIVELES_GENERAL.includes(nivel)) {
    // Agencia federal: califica todas las generales de toda la red.
    if (reviewerEsFederal) return true;
    // Socio de misma agencia.
    if (todoAgenciaId && reviewerAgenciaId && Number(todoAgenciaId) === Number(reviewerAgenciaId)) {
      return true;
    }
    return false;
  }

  // --- Tareas ESPECIALIZADAS (sin asignar) ---
  //    Califican: socios del ÁREA de la tarea (de toda la red).
  const todoAreas = Array.isArray(todo.areas) ? todo.areas : [];
  if (todoAreas.length === 0) return false;

  const todoAreaIds = todoAreas.map((a) => (typeof a === 'object' ? a.id : Number(a)));
  const reviewerAreas = Array.isArray(user.areas) ? user.areas : [];
  const reviewerAreaIds = reviewerAreas.map((a) =>
    typeof a === 'object' ? a.id : Number(a)
  );

  return todoAreaIds.some((aid) => reviewerAreaIds.includes(Number(aid)));
};

export const canUserPayTask = (task, userId) => {
  // Solo administradores o verificadores pueden pagar
  return task?.usuario?.roles?.extra?.includes('admin') || 
         task?.usuario?.roles?.extra?.includes('verificador');
};

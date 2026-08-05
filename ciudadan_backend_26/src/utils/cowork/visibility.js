'use strict';

/**
 * Reglas de visibilidad de tareas (spec documento-off.md líneas 32-35):
 *   - Tareas generales (nivel `general` / `becario`): visibles para todo el
 *     mundo, incluyendo visitantes no autenticados.
 *   - Tareas especializadas (nivel `especialidad` / `experto` /
 *     `personalizada`): solo visibles si el usuario tiene área, subárea o
 *     habilidad verificada que coincida con las de la tarea.
 *
 * Helpers reutilizables por `todo.find` y por `tarea.resolver` para no
 * duplicar la lógica de permisos.
 */

const NIVELES_GENERAL = ['general', 'becario', 'becarios'];

// Estados considerados "verificado" en user.area_details[areaId].status.
// `area_details` es un JSON { [areaId]: { status, ... } }.
const VERIFICATION_OK = new Set(['verified', 'aprobado', 'aprobada']);

/**
 * Devuelve true si el usuario es admin o socio (bypass de visibilidad).
 * Acepta tanto el formato Strapi clásico (user.role) como roles.extra
 * (arreglo de strings) usado en este proyecto.
 */
function isPrivilegedUser(user) {
  if (!user) return false;
  const rolesExtra = Array.isArray(user.roles?.extra) ? user.roles.extra : [];
  if (rolesExtra.includes('admin') || rolesExtra.includes('socio')) return true;
  const roleName = user.role?.name;
  if (roleName === 'Admin' || roleName === 'Socio') return true;
  return false;
}

/**
 * Devuelve los ids de áreas (incluyendo subáreas) verificadas para el usuario.
 * Combina:
 *   1. `user.area_details` (JSON) → ids con status verificado.
 *   2. `user.areas` (relación manyToMany) → ids asociados sin estado, los
 *      consideramos verificados si el usuario los tiene asignados.
 *      (El spec permite ambos: captura + verificación documental posterior.)
 */
async function getVerifiedAreaIds(user) {
  if (!user) return [];

  const ids = new Set();

  // 1. area_details (verificación documental por área)
  if (user.area_details && typeof user.area_details === 'object') {
    for (const [areaId, detail] of Object.entries(user.area_details)) {
      if (detail && VERIFICATION_OK.has(detail.status)) {
        const id = Number(areaId);
        if (!Number.isNaN(id)) ids.add(id);
      }
    }
  }

  // 2. áreas asociadas al usuario (relación) — consideradas verificadas
  //    si no hay area_details explícito diciendo lo contrario.
  if (Array.isArray(user.areas)) {
    for (const area of user.areas) {
      const id = typeof area === 'object' ? area.id : Number(area);
      if (id && !Number.isNaN(id)) {
        const details = user.area_details?.[id];
        // Si hay entry de area_details y NO está verificado, no añadir.
        if (!details || VERIFICATION_OK.has(details.status)) {
          ids.add(id);
        }
      }
    }
  }

  return Array.from(ids);
}

/**
 * Devuelve los ids de skills verificadas del usuario.
 * El spec (documento-off.md línea 151) deja abierto si las skills requieren
 * validación documental. En MVP: si el usuario tiene la skill relacionada,
 * se considera autorizado para filtrar por ella.
 */
async function getVerifiedSkillIds(user) {
  if (!user || !Array.isArray(user.skills)) return [];
  return user.skills
    .map((s) => (typeof s === 'object' ? s.id : Number(s)))
    .filter((id) => id && !Number.isNaN(id));
}

/**
 * Carga el usuario completo con áreas, area_details y skills.
 * Si el usuario ya viene populado (p.ej. desde policy), no recarga.
 */
async function loadUserWithRelations(user) {
  if (!user) return null;
  // Si ya tiene las relaciones populadas, devolver tal cual.
  if (Array.isArray(user.areas) && user.area_details !== undefined && Array.isArray(user.skills)) {
    return user;
  }

  const full = await strapi.entityService.findOne(
    'plugin::users-permissions.user',
    user.id,
    {
      fields: ['id', 'email', 'roles', 'area_details'],
      populate: { areas: true, skills: true, role: true },
    }
  );
  // Conservar roles/role del user original si la consulta no los trae.
  return {
    ...user,
    ...full,
    roles: user.roles || full?.roles,
    role: user.role || full?.role,
  };
}

/**
 * Construye el filtro de Strapi v4 para `find` de `todo`.
 *
 * Devuelve un objeto filters que incluye:
 *   - El filtro de status visible que ya estaba en el controller original.
 *   - $or: [ {nivel general/becario}, {areas.id $in verifiedAreaIds},
 *            {subareas.id $in verifiedAreaIds}, {skills.id $in verifiedSkillIds} ]
 *
 * Si no hay user (visitante) o el user no tiene nada verificado, solo ve
 * tareas generales.
 *
 * Si el user es privileged (admin/socio), no aplica filtro de visibilidad
 * (es el creador/gestor), solo el filtro de status original.
 */
async function buildTodoVisibilityFilter(user, visibleStatuses) {
  const filters = {};

  // Filtro de status (igual que el controller original)
  if (Array.isArray(visibleStatuses) && visibleStatuses.length > 0) {
    filters.status = { $in: visibleStatuses };
  }

  // Visitante (sin user): solo tareas generales
  if (!user) {
    filters.nivel = { $in: NIVELES_GENERAL };
    return filters;
  }

  // Admin/socio: ve todo (sin filtro de nivel)
  if (isPrivilegedUser(user)) {
    return filters;
  }

  // Cargar relaciones si no están
  const fullUser = await loadUserWithRelations(user);
  const verifiedAreaIds = await getVerifiedAreaIds(fullUser);
  const verifiedSkillIds = await getVerifiedSkillIds(fullUser);

  // Si el usuario no tiene nada verificado, solo ve generales
  if (verifiedAreaIds.length === 0 && verifiedSkillIds.length === 0) {
    filters.nivel = { $in: NIVELES_GENERAL };
    return filters;
  }

  // Usuario con verificación: ve generales + las especializadas que coincidan
  const orClauses = [
    { nivel: { $in: NIVELES_GENERAL } },
  ];

  if (verifiedAreaIds.length > 0) {
    orClauses.push({ areas: { id: { $in: verifiedAreaIds } } });
    orClauses.push({ subareas: { id: { $in: verifiedAreaIds } } });
  }
  if (verifiedSkillIds.length > 0) {
    orClauses.push({ skills: { id: { $in: verifiedSkillIds } } });
  }

  filters.$or = orClauses;
  return filters;
}

/**
 * Determina si un usuario puede tomar (resolver) un todo específico.
 * Usado por `tarea.resolver` antes de crear la resolución.
 *
 * Reglas (spec líneas 34, 112-113):
 *   - Tareas generales: cualquier autenticado.
 *   - Tareas especializadas: requiere área/subárea o skill verificada que
 *     coincida con la tarea.
 *   - Admin/socio: bypass (pueden operar sobre cualquier tarea).
 *
 * Devuelve { ok: true } o { ok: false, reason: string }.
 */
async function canUserTakeTodo(user, todo) {
  if (!user) return { ok: false, reason: 'No autenticado' };
  if (!todo) return { ok: false, reason: 'Tarea no encontrada' };

  if (isPrivilegedUser(user)) return { ok: true };

  // Tarea general: cualquier autenticado puede resolver
  if (NIVELES_GENERAL.includes(todo.nivel)) return { ok: true };

  // Tarea especializada: validar coincidencia con áreas/subáreas/skills
  // verificadas del usuario.
  const fullUser = await loadUserWithRelations(user);
  const verifiedAreaIds = new Set(await getVerifiedAreaIds(fullUser));
  const verifiedSkillIds = new Set(await getVerifiedSkillIds(fullUser));

  if (verifiedAreaIds.size === 0 && verifiedSkillIds.size === 0) {
    return {
      ok: false,
      reason: 'No tienes áreas ni habilidades verificadas para resolver esta tarea especializada',
    };
  }

  // Coincidencia areas
  const todoAreas = Array.isArray(todo.areas) ? todo.areas : [];
  const todoSubareas = Array.isArray(todo.subareas) ? todo.subareas : [];
  const todoSkills = Array.isArray(todo.skills) ? todo.skills : [];

  const areaMatch = [...todoAreas, ...todoSubareas].some((a) => {
    const id = typeof a === 'object' ? a.id : Number(a);
    return id && verifiedAreaIds.has(id);
  });
  const skillMatch = todoSkills.some((s) => {
    const id = typeof s === 'object' ? s.id : Number(s);
    return id && verifiedSkillIds.has(id);
  });

  if (!areaMatch && !skillMatch) {
    return {
      ok: false,
      reason: 'No tienes el área, subárea ni habilidad verificada requerida por esta tarea',
    };
  }

  return { ok: true };
}

module.exports = {
  NIVELES_GENERAL,
  isPrivilegedUser,
  getVerifiedAreaIds,
  getVerifiedSkillIds,
  loadUserWithRelations,
  buildTodoVisibilityFilter,
  canUserTakeTodo,
};

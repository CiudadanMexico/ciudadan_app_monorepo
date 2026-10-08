// src/utils/agregarTarea.helpers.js
//
// Lógica pura del formulario "Agregar tarea" (y reutilizada por
// SkillsManagement para las rutas de área). Todo es AGNÓSTICO AL NIVEL del
// árbol de áreas: se camina por `parent_area`, nunca por números `level`, así
// que un hipotético "nivel más" (Administrativo › Contabilidad › Impuestos)
// funciona sin tocar este archivo ni los formularios.
//
// Reglas de negocio que implementa (docs/README_logica_cowork.md):
//   - general/becario: NO requieren área (spec: sólo verifican al usuario).
//   - especialidad/experto/personalizada: SÍ requieren área (matriz de
//     calificación NIVELES_ESPECIALIZADA filtra por todo.areas).
//   - sólo "especialidad" exige además una SKILL (especialidad concreta
//     del catálogo, filtrada por el área elegida).

export const getAttr = (item) => item?.attributes || item || {};

/** Id desde cualquier forma de relación Strapi: {data}, plain, array o null. */
export const areaIdOf = (rel) => {
  if (rel === null || rel === undefined) return null;
  const value = rel?.data ?? rel;
  if (Array.isArray(value)) return value[0]?.id ?? value[0]?.attributes?.id ?? null;
  if (typeof value !== 'object') return Number(value) || null;
  return value.id ?? value.attributes?.id ?? null;
};

export const areaName = (area) => getAttr(area).name || getAttr(area).nombre || '';

/** id del área padre de un área (o null si es raíz / no viene poblado). */
export const getParentId = (area) => areaIdOf(getAttr(area).parent_area);

export const isActiveArea = (area) => (getAttr(area).is_active ?? getAttr(area).isActive) !== false;

export const isActiveSkill = (skill) => (getAttr(skill).is_active ?? true) !== false;

export const skillAreaId = (skill) => areaIdOf(getAttr(skill).area);

/** "Administrativo › Contabilidad" — cadena hasta la raíz (máx. 10 saltos). */
export const areaPath = (area, allAreas = []) => {
  if (!area) return '';
  const byId = new Map(
    allAreas.map((a) => [Number(areaIdOf(a) ?? getAttr(a).id), a])
  );
  const parts = [areaName(area)];
  let current = area;
  for (let hop = 0; hop < 10; hop += 1) {
    const parentId = getParentId(current);
    if (!parentId) break;
    const parent = byId.get(Number(parentId));
    if (!parent) break;
    parts.unshift(areaName(parent));
    current = parent;
  }
  return parts.join(' › ');
};

/** ¿El nivel necesita un área para poder crearse? */
export const requiereArea = (nivel) =>
  ['especialidad', 'experto', 'personalizada'].includes(nivel);

/** ¿El nivel necesita elegir una especialidad (skill) concreta? */
export const requiereEspecialidad = (nivel) => nivel === 'especialidad';

/**
 * Áreas que puede elegir el formulario para un nivel dado:
 *  - niveles sin skill (experto/personalizada): todas las activas;
 *  - especialidad: sólo las que tienen ≥1 skill activo (si no, el select
 *    quedaría con un área sin especialidades disponibles).
 */
export const areaOptions = (areas = [], skills = [], nivel) => {
  const activas = areas.filter(isActiveArea);
  if (!requiereEspecialidad(nivel)) return activas;
  const conSkill = new Set(
    skills.filter(isActiveSkill).map((s) => skillAreaId(s)).filter(Boolean).map(Number)
  );
  return activas.filter((a) => conSkill.has(Number(areaIdOf(a) ?? getAttr(a).id)));
};

/** Skills activas de un área, ordenadas alfabéticamente. */
export const especialidadOptions = (skills = [], areaId) => {
  if (!areaId) return [];
  return skills
    .filter(isActiveSkill)
    .filter((s) => Number(skillAreaId(s)) === Number(areaId))
    .slice()
    .sort((a, b) => String(getAttr(a).name || '').localeCompare(String(getAttr(b).name || '')));
};

/**
 * Cadena completa de un área: [raíz, …, padre, propia]. Se envía en
 * `todo.areas` para que (a) el chip de la raíz siga viendo la tarea agrupada
 * por su subárea y (b) `canUserRateTask` deje calificar a socios de la raíz.
 */
export const cadenaDeAreas = (area, allAreas = []) => {
  if (!area) return [];
  const byId = new Map(allAreas.map((a) => [Number(areaIdOf(a) ?? getAttr(a).id), a]));
  const cadena = [Number(areaIdOf(area))];
  let current = area;
  for (let hop = 0; hop < 10; hop += 1) {
    const parentId = getParentId(current);
    if (!parentId) break;
    const parent = byId.get(Number(parentId));
    if (!parent) break;
    cadena.unshift(Number(parentId));
    current = parent;
  }
  return cadena;
};

/**
 * Validación previa al submit. Devuelve un mensaje legible o null.
 * La "regla de oro" del usuario: con nivel especialidad hay DOS selects
 * obligatorios (área y especialidad).
 */
export const validarTarea = ({ nivel, areaSeleccionada, skillSeleccionado, skills = [] }) => {
  if (requiereArea(nivel) && !areaSeleccionada) {
    return 'Selecciona un área para este nivel de tarea.';
  }
  if (requiereEspecialidad(nivel)) {
    if (!areaSeleccionada) return 'Selecciona un área para este nivel de tarea.';
    if (!skillSeleccionado) return 'Selecciona una especialidad (skill) del área elegida.';
    const opciones = especialidadOptions(skills, areaSeleccionada);
    if (opciones.length === 0) {
      return 'El área elegida no tiene especialidades activas. Crea la habilidad en Gestión de habilidades.';
    }
  }
  return null;
};

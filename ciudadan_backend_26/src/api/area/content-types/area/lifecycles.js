'use strict';

const MAX_ROOT_AREAS = 5;
const ROOT_AREA_NAMES = [
  'Administrativo',
  'Técnico',
  'Comercial-difusión',
  'Software',
  'Creación multimedia',
];

function normalizeName(name) {
  if (!name) return '';
  return String(name).trim().toLowerCase();
}

module.exports = {
  async beforeCreate(event) {
    const { data } = event.params;

    // Validación de área raíz (level 0)
    if (data.level === 0 || data.level === undefined) {
      const dataLevel = data.level === undefined ? 0 : data.level;
      if (dataLevel === 0) {
        // Contar áreas raíz existentes
        const rootCount = await strapi.db.query('api::area.area').count({
          where: { level: 0 },
        });

        // Si estamos actualizando un área que ya es raíz, permitir (no es nueva)
        if (rootCount >= MAX_ROOT_AREAS && !data.id) {
          throw new Error(
            `Solo se permiten ${MAX_ROOT_AREAS} áreas raíz. ` +
              `Actualmente ya existen ${rootCount}.`
          );
        }

        // Validar nombre si viene: debe ser uno de los 5 oficiales
        if (data.name) {
          const normalized = normalizeName(data.name);
          const isAllowed = ROOT_AREA_NAMES.some((n) => normalizeName(n) === normalized);
          // Si ya existen áreas con ese nombre lo permitimos (es la misma)
          // Solo validamos dureza si estamos creando una nueva área raíz con nombre no-listado
          if (!isAllowed && !data.id) {
            const existingWithSameName = await strapi.db.query('api::area.area').count({
              where: { name: { $eq: data.name }, level: 0 },
            });
            if (existingWithSameName === 0) {
              throw new Error(
                `Las áreas raíz solo pueden llamarse: ${ROOT_AREA_NAMES.join(', ')}.`
              );
            }
          }
        }
      }
    }

    if (data.parent_area) {
      if (data.parent_area === data.id) {
        throw new Error('Un área no puede ser padre de sí misma');
      }
    }
  },

  async beforeUpdate(event) {
    const { data, where } = event.params;

    // Si se está cambiando a level 0 (convirtiendo en raíz), aplicar límite
    if (data.level === 0) {
      const rootCount = await strapi.db.query('api::area.area').count({
        where: { level: 0, id: { $ne: where.id } },
      });
      if (rootCount >= MAX_ROOT_AREAS) {
        throw new Error(
          `Solo se permiten ${MAX_ROOT_AREAS} áreas raíz. Ya existen ${rootCount} además de esta.`
        );
      }
      if (data.name) {
        const normalized = normalizeName(data.name);
        const isAllowed = ROOT_AREA_NAMES.some((n) => normalizeName(n) === normalized);
        if (!isAllowed) {
          // Verificar si ya existe otra área con ese nombre (caso edición mismo nombre)
          const existingWithSameName = await strapi.db.query('api::area.area').count({
            where: { name: { $eq: data.name }, level: 0, id: { $ne: where.id } },
          });
          if (existingWithSameName === 0) {
            throw new Error(
              `Las áreas raíz solo pueden llamarse: ${ROOT_AREA_NAMES.join(', ')}.`
            );
          }
        }
      }
    }

    if (data.parent_area) {
      const parentId = typeof data.parent_area === 'object'
        ? data.parent_area.connect?.[0]?.id || data.parent_area.set?.id || data.parent_area.id
        : data.parent_area;

      if (parentId === where.id) {
        throw new Error('Un área no puede ser padre de sí misma');
      }

      const isCircular = await checkCircularReference(where.id, parentId);
      if (isCircular) {
        throw new Error('No se puede asignar un área hija como padre (referencia circular)');
      }
    }
  },
};

async function checkCircularReference(areaId, targetParentId) {
  if (!targetParentId) return false;

  const area = await strapi.entityService.findOne('api::area.area', targetParentId, {
    populate: { parent_area: true },
  });

  if (!area) return false;

  if (area.parent_area && area.parent_area.id === areaId) {
    return true;
  }

  return checkCircularReference(areaId, area.parent_area?.id);
}

'use strict';

module.exports = {
  async beforeCreate(event) {
    const { data } = event.params;

    if (data.parent_area) {
      if (data.parent_area === data.id) {
        throw new Error('Un área no puede ser padre de sí misma');
      }
    }
  },

  async beforeUpdate(event) {
    const { data, where } = event.params;

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

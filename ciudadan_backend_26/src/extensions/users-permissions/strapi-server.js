'use strict';

const USER_UID = 'plugin::users-permissions.user';
const AREA_UID = 'api::area.area';

module.exports = function extendUsersPermissionsPlugin(plugin) {
  plugin.controllers.user.assignAreas = async function assignAreas(ctx) {
    const userId = Number(ctx.params.id);
    const { areaIds } = ctx.request.body || {};

    if (!Number.isInteger(userId) || userId <= 0) {
      return ctx.badRequest('El ID de usuario debe ser un entero positivo');
    }

    if (!Array.isArray(areaIds)) {
      return ctx.badRequest('areaIds debe ser un arreglo de IDs de áreas');
    }

    const normalizedAreaIds = [...new Set(areaIds.map(Number))];
    const hasInvalidAreaId = normalizedAreaIds.some(
      (areaId) => !Number.isInteger(areaId) || areaId <= 0
    );

    if (hasInvalidAreaId) {
      return ctx.badRequest('Todos los IDs de áreas deben ser enteros positivos');
    }

    const user = await strapi.entityService.findOne(USER_UID, userId, {
      fields: ['id'],
    });

    if (!user) {
      return ctx.notFound('Usuario no encontrado');
    }

    const areas = normalizedAreaIds.length
      ? await strapi.entityService.findMany(AREA_UID, {
          filters: {
            id: {
              $in: normalizedAreaIds,
            },
          },
          fields: ['id'],
          publicationState: 'preview',
        })
      : [];

    const existingAreaIds = new Set(areas.map((area) => area.id));
    const missingAreaIds = normalizedAreaIds.filter((areaId) => !existingAreaIds.has(areaId));

    if (missingAreaIds.length > 0) {
      return ctx.badRequest('Una o más áreas no existen', {
        missingAreaIds,
      });
    }

    const updatedUser = await strapi.entityService.update(USER_UID, userId, {
      data: {
        areas: {
          set: normalizedAreaIds.map((areaId) => ({ id: areaId })),
        },
      },
      fields: ['id', 'username', 'email'],
      populate: {
        areas: {
          fields: ['id', 'nombre', 'nivel', 'is_active'],
        },
      },
    });

    return ctx.send({
      data: updatedUser,
    });
  };

  plugin.routes['content-api'].routes.push({
    method: 'PUT',
    path: '/users/:id/areas',
    handler: 'user.assignAreas',
    config: {
      prefix: '',
      policies: [],
    },
  });

  return plugin;
};

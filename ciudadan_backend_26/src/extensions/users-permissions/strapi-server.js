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
          fields: ['id', 'name', 'level', 'is_active'],
        },
      },
    });

    return ctx.send({
      data: updatedUser,
    });
  };

  plugin.controllers.user.getAreas = async function getAreas(ctx) {
    const userId = Number(ctx.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return ctx.badRequest('El ID de usuario debe ser un entero positivo');
    }

    const user = await strapi.entityService.findOne(USER_UID, userId, {
      fields: ['id', 'username', 'email'],
      populate: {
        areas: {
          fields: ['id', 'name', 'level', 'is_active'],
        },
      },
    });

    if (!user) {
      return ctx.notFound('Usuario no encontrado');
    }

    return ctx.send({
      data: user,
    });
  };

  plugin.routes['content-api'].routes.push({
    method: 'PUT',
    path: '/users/:id/areas',
    handler: 'user.assignAreas',
    config: {
      prefix: '',
      auth: false,
      policies: ['global::is-authenticated-auth0'],
    },
  });

  plugin.routes['content-api'].routes.push({
    method: 'GET',
    path: '/users/:id/areas',
    handler: 'user.getAreas',
    config: {
      prefix: '',
      auth: false,
      policies: [],
    },
  });

  // Override de las rutas built-in de users para que acepten Auth0 (no Strapi JWT).
  // Sin esto, cualquier GET /api/users con Bearer Auth0 recibía 401 porque
  // el plugin users-permissions validaba con su propio JWT secreto.
  // Encima, dejar auth: false y sin policy para `/users` (find/findOne): el FE RolesContext
  // hace estas llamadas al inicio antes de tener token Strapi establecido.
  const builtIn = plugin.routes['content-api'].routes;
  const routeOverrides = [
    { method: 'GET',   path: '/users',        handler: 'user.find',     policies: [] },
    { method: 'GET',   path: '/users/count',  handler: 'user.count',    policies: [] },
    { method: 'GET',   path: '/users/me',     handler: 'user.me',       policies: ['global::is-authenticated-auth0'] },
    { method: 'GET',   path: '/users/:id',    handler: 'user.findOne',   policies: ['global::is-authenticated-auth0'] },
    { method: 'POST',  path: '/users',        handler: 'user.create',    policies: [] },
    { method: 'PUT',    path: '/users/:id',   handler: 'user.update',    policies: ['global::is-authenticated-auth0'] },
    { method: 'DELETE', path: '/users/:id',   handler: 'user.destroy',   policies: ['global::is-authenticated-auth0'] },
  ];
  for (const r of routeOverrides) {
    const existing = builtIn.find((x) => x.method === r.method && x.path === r.path);
    if (existing) {
      existing.config = existing.config || {};
      existing.config.prefix = '';
      existing.config.auth = false;
      existing.config.policies = r.policies;
    } else {
      builtIn.push({
        method: r.method,
        path: r.path,
        handler: r.handler,
        config: { prefix: '', auth: false, policies: r.policies },
      });
    }
  }

  // =====================================================================
  // Fix 5.3 / spec 5.3 — "escribirla si no existe":
  // El usuario puede proponer una subárea (carrera/oficio) nueva si no
  // encuentra la que necesita en la lista. La propuesta se guarda en
  // `user.area_details.proposed_subareas[]` para que un socio/verificador
  // la revise y cree la subárea en Strapi (POST /api/areas con policy
  // is-admin-or-socio). No rompe la restricción de 5 áreas raíz: las
  // proposed_subareas son texto libre pendiente de aprobación, no se
  // convierten en `area` hasta que un socio las aprueba.
  // =====================================================================

  // Helper: merge no destructivo sobre area_details (igual que Fix D).
  const getAreaDetailsObj = (raw) =>
    raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};

  plugin.controllers.user.proposeSubarea = async function proposeSubarea(ctx) {
    const userId = Number(ctx.params.id);
    const { areaId, nombre, observaciones } = ctx.request.body || {};
    const requester = ctx.state.strapiUser;

    if (!Number.isInteger(userId) || userId <= 0) {
      return ctx.badRequest('El ID de usuario debe ser un entero positivo');
    }
    // Solo el propio usuario puede proponer para sí mismo (o admin/socio).
    if (requester && Number(requester.id) !== userId) {
      const requesterRoles = requester.roles?.extra || requester.roles || [];
      const extra = Array.isArray(requesterRoles) ? requesterRoles : [];
      const isAdminOrSocio = extra.includes('admin') || extra.includes('socio');
      if (!isAdminOrSocio) {
        return ctx.forbidden('Solo puedes proponer subáreas para tu propio usuario');
      }
    }
    if (!areaId) return ctx.badRequest('areaId es requerido (área raíz bajo la cual proponer)');
    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return ctx.badRequest('nombre es requerido (texto libre de la carrera/oficio)');
    }
    if (nombre.length > 200) return ctx.badRequest('nombre demasiado largo (max 200)');

    const userIdNum = userId;
    const areaIdNum = Number(areaId);
    if (!Number.isInteger(areaIdNum) || areaIdNum <= 0) {
      return ctx.badRequest('areaId debe ser entero positivo');
    }

    // Verificar que el área raíz exista y esté activa.
    const area = await strapi.entityService.findOne(AREA_UID, areaIdNum, {
      fields: ['id', 'name', 'level', 'is_active'],
    });
    if (!area) return ctx.notFound('Área raíz no existe');
    if (area.is_active === false) {
      return ctx.badRequest('El área está inactiva');
    }

    const user = await strapi.entityService.findOne(USER_UID, userIdNum, {
      fields: ['id', 'username', 'email', 'area_details'],
    });
    if (!user) return ctx.notFound('Usuario no encontrado');

    const details = getAreaDetailsObj(user.area_details);
    const propuestasPrevias = Array.isArray(details.proposed_subareas)
      ? details.proposed_subareas
      : [];
    const nuevaPropuesta = {
      nombre: nombre.trim().slice(0, 200),
      areaId: areaIdNum,
      areaName: area.name,
      observaciones:
        typeof observaciones === 'string' ? observaciones.slice(0, 500) : '',
      propuesta_por: requester?.email || requester?.username || String(requester?.id || 'desconocido'),
      propuesta_en: new Date().toISOString(),
      estado: 'pending', // 'pending' | 'approved' | 'rejected'
    };

    // Evitar duplicados (mismo nombre + areaId ya pendiente).
    const duplicado = propuestasPrevias.some(
      (p) =>
        p &&
        typeof p === 'object' &&
        p.areaId === areaIdNum &&
        String(p.nombre).toLowerCase() === String(nuevaPropuesta.nombre).toLowerCase() &&
        (p.estado || 'pending') === 'pending'
    );
    if (duplicado) {
      return ctx.badRequest('Ya tienes una propuesta pendiente para esa carrera en esa área');
    }

    const nuevasPropuestas = [...propuestasPrevias, nuevaPropuesta];
    const nuevoAreaDetails = { ...details, proposed_subareas: nuevasPropuestas };

    const updated = await strapi.entityService.update(USER_UID, userIdNum, {
      data: { area_details: nuevoAreaDetails },
      fields: ['id', 'username', 'email', 'area_details'],
    });

    ctx.body = {
      data: {
        user: { id: updated.id, username: updated.username, email: updated.email },
        propuesta: nuevaPropuesta,
        total_propuestas: nuevasPropuestas.length,
      },
    };
  };

  plugin.controllers.user.listProposedSubareas = async function listProposedSubareas(ctx) {
    const userId = Number(ctx.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return ctx.badRequest('El ID de usuario debe ser un entero positivo');
    }
    const user = await strapi.entityService.findOne(USER_UID, userId, {
      fields: ['id', 'username', 'email', 'area_details'],
    });
    if (!user) return ctx.notFound('Usuario no encontrado');

    const details = getAreaDetailsObj(user.area_details);
    const propuestas = Array.isArray(details.proposed_subareas)
      ? details.proposed_subareas
      : [];
    ctx.body = {
      data: {
        user: { id: user.id, username: user.username, email: user.email },
        proposed_subareas: propuestas,
      },
    };
  };

  plugin.routes['content-api'].routes.push({
    method: 'POST',
    path: '/users/:id/proponer-subarea',
    handler: 'user.proposeSubarea',
    config: {
      prefix: '',
      auth: false,
      policies: ['global::is-authenticated-auth0'],
    },
  });

  plugin.routes['content-api'].routes.push({
    method: 'GET',
    path: '/users/:id/proposed-subareas',
    handler: 'user.listProposedSubareas',
    config: {
      prefix: '',
      auth: false,
      policies: ['global::is-authenticated-auth0'],
    },
  });

  return plugin;
};

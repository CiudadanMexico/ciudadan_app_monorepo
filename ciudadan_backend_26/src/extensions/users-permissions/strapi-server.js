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

  // =====================================================================
  // Flujo "Verificación" (spec documento-off.md 5/34-35): el usuario sube
  // documentación de SU propia área/carrera, y un socio/verificador la
  // revisa. Antes de este fix, la subida de documentos en Perfil.jsx era
  // puramente decorativa (el archivo se subía a la Media Library de Strapi
  // pero nunca quedaba asociado a `area_details`, así que ningún verificador
  // podía verlo jamás). Este endpoint es el que faltaba: self-service,
  // adjunta un documento ya subido (con su URL) al area_details propio.
  // =====================================================================
  const getAreaDetailsObjDoc = (raw) =>
    raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const MAX_DOCUMENTOS_POR_AREA = 10;

  plugin.controllers.user.subirDocumentoArea = async function subirDocumentoArea(ctx) {
    const userId = Number(ctx.params.id);
    const { areaId, documento, observaciones } = ctx.request.body || {};
    const requester = ctx.state.strapiUser;

    if (!Number.isInteger(userId) || userId <= 0) {
      return ctx.badRequest('El ID de usuario debe ser un entero positivo');
    }
    if (requester && Number(requester.id) !== userId) {
      const requesterRoles = requester.roles?.extra || requester.roles || [];
      const extra = Array.isArray(requesterRoles) ? requesterRoles : [];
      const isAdminOrSocio = extra.includes('admin') || extra.includes('socio');
      if (!isAdminOrSocio) {
        return ctx.forbidden('Solo puedes subir documentos para tu propio usuario');
      }
    }
    const areaIdNum = Number(areaId);
    if (!Number.isInteger(areaIdNum) || areaIdNum <= 0) {
      return ctx.badRequest('areaId debe ser entero positivo');
    }
    if (!documento || typeof documento !== 'object') {
      return ctx.badRequest('documento es requerido: { nombre, url, size?, tipo? }');
    }
    const { nombre, url, size, tipo } = documento;
    if (!nombre || !url) {
      return ctx.badRequest('documento.nombre y documento.url son requeridos');
    }

    const area = await strapi.entityService.findOne(AREA_UID, areaIdNum, { fields: ['id'] });
    if (!area) return ctx.notFound('Área no existe');

    const user = await strapi.entityService.findOne(USER_UID, userId, {
      fields: ['id', 'email', 'username', 'area_details'],
    });
    if (!user) return ctx.notFound('Usuario no encontrado');

    const details = getAreaDetailsObjDoc(user.area_details);
    const entryPrev = details[String(areaIdNum)] || {};
    const documentosPrev = Array.isArray(entryPrev.documentos) ? entryPrev.documentos : [];

    if (documentosPrev.length >= MAX_DOCUMENTOS_POR_AREA) {
      return ctx.badRequest(`Máximo ${MAX_DOCUMENTOS_POR_AREA} documentos por área`);
    }

    const nuevoDoc = {
      nombre: String(nombre).slice(0, 255),
      url: String(url).slice(0, 1024),
      size: Number.isInteger(size) ? size : 0,
      tipo: String(tipo || '').slice(0, 100),
      subido_por: requester?.email || user.email || null,
      subido_en: new Date().toISOString(),
    };

    // No pisa el status existente (si ya estaba verified/rejected, un doc
    // nuevo no lo revierte solo); si es la primera vez, arranca en pending.
    // `observaciones`: texto de experiencia/certificaciones que el propio
    // usuario declara al auto-declararse en esta área (spec: "puede poner
    // texto, un campo de texto y otro campo con documentos que lo
    // acrediten"). Solo se sobreescribe si viene explícito en el body.
    const nuevoEntry = {
      status: 'pending',
      ...entryPrev,
      documentos: [...documentosPrev, nuevoDoc],
    };
    if (typeof observaciones === 'string' && observaciones.trim()) {
      nuevoEntry.observaciones = observaciones.trim().slice(0, 1000);
    }
    const nuevoAreaDetails = { ...details, [String(areaIdNum)]: nuevoEntry };

    await strapi.entityService.update(USER_UID, userId, {
      data: { area_details: nuevoAreaDetails },
      fields: ['id'],
    });

    ctx.body = {
      data: {
        areaId: areaIdNum,
        documento: nuevoDoc,
        total_documentos: nuevoEntry.documentos.length,
      },
    };
  };

  plugin.routes['content-api'].routes.push({
    method: 'POST',
    path: '/users/:id/subir-documento-area',
    handler: 'user.subirDocumentoArea',
    config: {
      prefix: '',
      auth: false,
      policies: ['global::is-authenticated-auth0'],
    },
  });

  // =====================================================================
  // Aprobar/rechazar una propuesta de subárea (spec 5.3 "elegirla de la
  // lista o escribirla si no existe"): antes no existía NINGÚN endpoint
  // para convertir una propuesta (texto libre en area_details.proposed_
  // subareas[]) en una subárea real utilizable — proponer era un callejón
  // sin salida. Al aprobar: reusa la subárea si ya existe una con el mismo
  // nombre bajo la misma área raíz (evita duplicados si dos personas
  // proponen "Desarrollo Backend"), o la crea. Luego la asigna al usuario.
  // =====================================================================
  plugin.controllers.user.revisarSubarea = async function revisarSubarea(ctx) {
    const userId = Number(ctx.params.id);
    const { areaId, nombre, decision, motivo } = ctx.request.body || {};
    const reviewer = ctx.state.strapiUser;

    if (!Number.isInteger(userId) || userId <= 0) {
      return ctx.badRequest('El ID de usuario debe ser un entero positivo');
    }
    if (!areaId || !nombre) {
      return ctx.badRequest('areaId y nombre son requeridos para identificar la propuesta');
    }
    if (!['approved', 'rejected'].includes(decision)) {
      return ctx.badRequest('decision debe ser "approved" o "rejected"');
    }
    if (decision === 'rejected' && (!motivo || !String(motivo).trim())) {
      return ctx.badRequest('motivo es requerido para rechazar una propuesta');
    }

    const areaIdNum = Number(areaId);
    const user = await strapi.entityService.findOne(USER_UID, userId, {
      fields: ['id', 'email', 'username', 'area_details'],
    });
    if (!user) return ctx.notFound('Usuario no encontrado');

    const details = getAreaDetailsObjDoc(user.area_details);
    const propuestas = Array.isArray(details.proposed_subareas) ? details.proposed_subareas : [];
    const idx = propuestas.findIndex(
      (p) =>
        p &&
        typeof p === 'object' &&
        p.areaId === areaIdNum &&
        String(p.nombre).toLowerCase() === String(nombre).toLowerCase() &&
        (p.estado || 'pending') === 'pending'
    );
    if (idx === -1) {
      return ctx.notFound('No se encontró una propuesta pendiente con esos datos');
    }

    const propuesta = propuestas[idx];
    let subareaCreadaOReusada = null;

    if (decision === 'approved') {
      const hermanas = await strapi.entityService.findMany(AREA_UID, {
        filters: { parent_area: areaIdNum },
        fields: ['id', 'name'],
      });
      const match = hermanas.find(
        (a) => String(a.name).toLowerCase() === String(propuesta.nombre).toLowerCase()
      );
      subareaCreadaOReusada = match || await strapi.entityService.create(AREA_UID, {
        data: {
          name: propuesta.nombre,
          level: 1,
          is_active: true,
          parent_area: areaIdNum,
          publishedAt: new Date().toISOString(),
        },
      });

      const userConAreas = await strapi.entityService.findOne(USER_UID, userId, {
        fields: ['id'],
        populate: { areas: { fields: ['id'] } },
      });
      const idsActuales = (userConAreas.areas || []).map((a) => a.id);
      if (!idsActuales.includes(subareaCreadaOReusada.id)) {
        await strapi.entityService.update(USER_UID, userId, {
          data: { areas: { set: [...idsActuales.map((id) => ({ id })), { id: subareaCreadaOReusada.id }] } },
        });
      }
    }

    propuestas[idx] = {
      ...propuesta,
      estado: decision,
      revisado_por: reviewer?.email || reviewer?.username || String(reviewer?.id || 'desconocido'),
      revisado_en: new Date().toISOString(),
      ...(decision === 'rejected' ? { motivo_rechazo: String(motivo).slice(0, 500) } : {}),
      ...(subareaCreadaOReusada ? { areaCreadaId: subareaCreadaOReusada.id } : {}),
    };

    await strapi.entityService.update(USER_UID, userId, {
      data: { area_details: { ...details, proposed_subareas: propuestas } },
      fields: ['id'],
    });

    ctx.body = {
      data: {
        propuesta: propuestas[idx],
        subarea: subareaCreadaOReusada,
      },
    };
  };

  plugin.routes['content-api'].routes.push({
    method: 'POST',
    path: '/users/:id/revisar-subarea',
    handler: 'user.revisarSubarea',
    config: {
      prefix: '',
      auth: false,
      policies: ['global::is-verificador'],
    },
  });

  return plugin;
};

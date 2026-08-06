'use strict';

/**
 * POST /areas/verificar-area
 *
 * Verificación formal del área/subárea de un usuario.
 * Sólo admin/verificador (policy global::is-verificador) puede ejecutarlo.
 *
 * Marca (o desmarca) `area_details.status` de un usuario a uno de:
 *   - 'verified'   (aprueba la verificación de esa área)
 *   - 'pending'    (deja pendiente de revisión — default)
 *   - 'rejected'   (rechaza la verificación)
 *
 * `area_details` es un JSON libre en up_users con shape convencional:
 *   { [areaId]: { status: 'pending'|'verified'|'rejected',
 *                 observaciones?: string,
 *                 verificado_por?: string,
 *                 verificado_en?: ISO date,
 *                 documentos?: [{nombre, url, size}, ...] } }
 *
 * El endpoint mergea el entry del área indicada sin pisar otros, y siempre
 * registra quién (verificador) y cuándo se emitió el cambio. No toucha la
 * relación `users.areas` (vive aparte, asignable por PUT /users/:id/areas).
 *
 * Spec: documento-off.md:34-35, 114 — verificador revisa documentos y marca
 * el área como verificada o en proceso.
 */

const ESTADOS_VALIDOS = ['verified', 'pending', 'rejected'];
const USER_UID = 'plugin::users-permissions.user';

module.exports = {
  async verificarArea(ctx) {
    const reviewer = ctx.state.strapiUser;
    if (!reviewer) return ctx.throw(401, 'No autenticado');

    const { userId, areaId, status, observaciones, documentos } = ctx.request.body || {};

    // 1. Validaciones de entrada
    if (!userId) return ctx.throw(400, 'userId es requerido');
    if (!areaId) return ctx.throw(400, 'areaId es requerido');
    if (!status) return ctx.throw(400, 'status es requerido');
    if (!ESTADOS_VALIDOS.includes(status)) {
      return ctx.throw(400, `status inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(', ')}`);
    }
    // documentos (opcional): array de evidencias [{ nombre, url, size, tipo, subido_por?, subido_en? }]
    let documentosNormalized = null;
    if (documentos !== undefined) {
      if (!Array.isArray(documentos)) {
        return ctx.throw(400, 'documentos debe ser un array');
      }
      // Limitar a 10 archivos, validar tamaño en bytes (<= 10MB por archivo)
      if (documentos.length > 10) {
        return ctx.throw(400, 'Máximo 10 documentos por verificación');
      }
      documentosNormalized = documentos.map((d) => {
        if (!d || typeof d !== 'object') return null;
        return {
          nombre: String(d.nombre || d.name || '').slice(0, 255),
          url: String(d.url || '').slice(0, 1024),
          size: Number.isInteger(d.size) ? d.size : 0,
          tipo: String(d.tipo || d.type || '').slice(0, 100),
          subido_por: d.subido_por ? String(d.subido_por).slice(0, 255) : (reviewer.email || reviewer.username || String(reviewer.id)),
          subido_en: d.subido_en || new Date().toISOString(),
        };
      }).filter(Boolean);
    }
    const userIdNum = Number(userId);
    const areaIdNum = Number(areaId);
    if (!Number.isInteger(userIdNum) || userIdNum <= 0) {
      return ctx.throw(400, 'userId debe ser entero positivo');
    }
    if (!Number.isInteger(areaIdNum) || areaIdNum <= 0) {
      return ctx.throw(400, 'areaId debe ser entero positivo');
    }

    // 2. Cargar usuario y área (existence check)
    const user = await strapi.entityService.findOne(USER_UID, userIdNum, {
      fields: ['id', 'username', 'email', 'area_details'],
    });
    if (!user) return ctx.throw(404, 'Usuario no existe');

    const area = await strapi.entityService.findOne('api::area.area', areaIdNum, {
      fields: ['id', 'name', 'level', 'is_active'],
    });
    if (!area) return ctx.throw(404, 'Área no existe');
    if (area.is_active === false) {
      return ctx.throw(400, 'El área está inactiva, no se puede verificar');
    }

    // 3. Construcción del nuevo area_details (merge no destructivo)
    const prevRaw = user.area_details;
    const prevDetails = prevRaw && typeof prevRaw === 'object' && !Array.isArray(prevRaw)
      ? prevRaw
      : {};
    const entryPrev = prevDetails[String(areaIdNum)] || {};

    const nuevoEntry = {
      ...entryPrev,
      status,
      verificado_por: reviewer.email || reviewer.username || String(reviewer.id),
      verificado_en: new Date().toISOString(),
    };
    if (observaciones !== undefined) {
      nuevoEntry.observaciones =
        typeof observaciones === 'string' ? observaciones.slice(0, 1000) : '';
    }
    // status 'rejected' requiere observaciones no vacías
    if (status === 'rejected' && !nuevoEntry.observaciones) {
      return ctx.throw(400, 'Para status=rejected, observaciones es requerido');
    }
    // Propagar documentos heredados + añadir nuevos (si llegaron en el body).
    // Comportamiento: si `documentos` llega en el body, se REPLAZA el array
    // (merge de upload + tus anteriores controlado desde el FE). Si no llega,
    // se preserva el array heredado tal cual (no destructivo).
    if (documentosNormalized !== null) {
      nuevoEntry.documentos = documentosNormalized;
    } else if (Array.isArray(entryPrev.documentos)) {
      nuevoEntry.documentos = entryPrev.documentos;
    }

    const nuevoAreaDetails = { ...prevDetails, [String(areaIdNum)]: nuevoEntry };

    // 4. Persistir
    const actualizado = await strapi.entityService.update(USER_UID, userIdNum, {
      data: { area_details: nuevoAreaDetails },
      fields: ['id', 'username', 'email', 'area_details'],
    });

    // 5. Respuesta — shape consistente con el resto del plugin
    ctx.body = {
      data: {
        user: {
          id: actualizado.id,
          username: actualizado.username,
          email: actualizado.email,
        },
        area: { id: area.id, name: area.name, level: area.level },
        status,
        verificado_por: nuevoEntry.verificado_por,
        verificado_en: nuevoEntry.verificado_en,
        area_details: actualizado.area_details,
      },
    };
  },

  async listarVerificaciones(ctx) {
    const { userId } = ctx.request.query || {};
    const reviewer = ctx.state.strapiUser;
    if (!reviewer) return ctx.throw(401, 'No autenticado');
    if (!userId) return ctx.throw(400, 'userId es requerido (query)');

    const userIdNum = Number(userId);
    if (!Number.isInteger(userIdNum) || userIdNum <= 0) {
      return ctx.throw(400, 'userId debe ser entero positivo');
    }

    const user = await strapi.entityService.findOne(USER_UID, userIdNum, {
      fields: ['id', 'username', 'email', 'area_details'],
      populate: {
        areas: { fields: ['id', 'name', 'level', 'is_active'] },
      },
    });
    if (!user) return ctx.throw(404, 'Usuario no existe');

    const details = user.area_details && typeof user.area_details === 'object'
      ? user.area_details
      : {};

    const items = (user.areas || []).map((a) => {
      const entry = details[String(a.id)] || {};
      return {
        areaId: a.id,
        name: a.name,
        level: a.level,
        is_active: a.is_active,
        status: entry.status || 'pending',
        observaciones: entry.observaciones || null,
        verificado_por: entry.verificado_por || null,
        verificado_en: entry.verificado_en || null,
        documentos: Array.isArray(entry.documentos) ? entry.documentos.length : 0,
      };
    });

    ctx.body = {
      data: {
        user: { id: user.id, username: user.username, email: user.email },
        verificaciones: items,
      },
    };
  },
};

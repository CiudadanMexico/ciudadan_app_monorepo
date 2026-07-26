'use strict';

/**
 * Listado de tareas con filtros por estado, usuario y agencia.
 * Requiere autenticación Auth0 (cualquier usuario logueado).
 *
 * Query params soportados:
 *   status      — un estado o lista separada por comas (ej: "completada,corregida")
 *   usuarioId   — id del usuario creador/asignado
 *   agenciaId   — id de la agencia
 *   todoId      — id del todo padre
 *   page        — página (default 1)
 *   pageSize    — tamaño de página (default 25, max 100)
 */

module.exports = {
  async findFiltered(ctx) {
    const { status, usuarioId, agenciaId, todoId, page, pageSize } = ctx.query;
    const requester = ctx.state.strapiUser;

    if (!requester) return ctx.unauthorized('No autenticado');

    // ACL por rol (spec: solo socios/admin pueden ver todas las resoluciones).
    // Un usuario normal solo puede listar sus propias tareas. Un socio/admin
    // puede filtrar libremente (incluso sin pasar `usuarioId`).
    const rolesExtra = Array.isArray(requester.roles?.extra) ? requester.roles.extra : [];
    const roleName = requester.role?.name;
    const isPrivileged = rolesExtra.includes('admin') || rolesExtra.includes('socio')
      || roleName === 'Admin' || roleName === 'Socio' || roleName === 'Authenticated';

    const filters = {};

    // Filtro por estado (acepta uno o varios separados por coma)
    if (status) {
      const estados = String(status)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      if (estados.length === 1) {
        filters.status = { $eq: estados[0] };
      } else if (estados.length > 1) {
        filters.status = { $in: estados };
      }
    }

    // Filtro por usuario. Un usuario no privilegiado solo puede verse a sí
    // mismo (incluso si intenta pasar `usuarioId` de otro, se ignora).
    if (isPrivileged && usuarioId) {
      filters.usuario = { id: Number(usuarioId) };
    } else if (!isPrivileged) {
      filters.usuario = { id: requester.id };
    }

    // Filtro por agencia
    if (agenciaId) {
      filters.agencia = { id: Number(agenciaId) };
    }

    // Filtro por todo padre
    if (todoId) {
      filters.todo = { id: Number(todoId) };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 25));

    const result = await strapi.entityService.findMany('api::tarea.tarea', {
      filters,
      populate: {
        todo: true,
        usuario: true,
        reviewed_by: true,
        agencia: true,
      },
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
      },
      orderBy: { createdAt: 'DESC' },
    });

    // entityService.findMany no devuelve metadatos de paginación;
    // los calculamos manualmente
    const total = await strapi.db.query('api::tarea.tarea').count({ where: filters });

    ctx.body = {
      data: result,
      meta: {
        pagination: {
          page: pageNum,
          pageSize: pageSizeNum,
          pageCount: Math.ceil(total / pageSizeNum),
          total,
        },
        filters: { status, usuarioId, agenciaId, todoId },
      },
    };
  },
};

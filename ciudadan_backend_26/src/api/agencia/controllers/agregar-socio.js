'use strict';

/**
 * POST /api/agencias/mi-agencia/socios
 *
 * Da de alta (o afilia) un usuario como socio miembro de la agencia del
 * admin/socio autenticado. La agencia YA NO se elige por parámetro: se
 * resuelve siempre de la propia cuenta que hace la petición (chat.md,
 * "la agencia no se debe seleccionar ahí").
 *
 * Body: { email, username?, roles_extra? }
 *   - email:        obligatorio. Si el usuario no existe, se crea.
 *   - username:     opcional. Si no se envía, se usa el email.
 *   - roles_extra:  opcional. Array de roles extra (por defecto ['socio']).
 *
 * Un usuario no puede pertenecer a dos agencias (chat.md, "un usuario no
 * puede tener dos agencias"): si el email ya existe y ya tiene una agencia
 * distinta, se rechaza con un mensaje explícito en vez de reasignarla en
 * silencio (bug del comportamiento anterior).
 *
 * Solo admin/socio pueden invocar (policy global::is-admin-or-socio).
 */

const USER_UID = 'plugin::users-permissions.user';

module.exports = {
  async agregarSocio(ctx) {
    const { email, username, roles_extra } = ctx.request.body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return ctx.badRequest('Email inválido');
    }

    // 1. Resolver la agencia propia de quien hace la petición.
    const caller = await strapi.db.query(USER_UID).findOne({
      where: { id: ctx.state.strapiUser.id },
      populate: { agencia: true },
    });
    const agenciaId = caller?.agencia?.id || null;
    if (!agenciaId) {
      return ctx.badRequest('Tu cuenta no tiene una agencia asignada, no puedes agregar socios');
    }

    // 2. Buscar usuario por email.
    const existing = await strapi.db.query(USER_UID).findOne({
      where: { email },
      populate: { agencia: true },
    });

    const extra = Array.isArray(roles_extra) && roles_extra.length > 0
      ? roles_extra
      : ['socio'];

    let user;
    if (existing) {
      // Un usuario no puede tener dos agencias: si ya tiene una (distinta o
      // no), se rechaza y se pide darlo de baja de la suya primero.
      if (existing.agencia && Number(existing.agencia.id) !== Number(agenciaId)) {
        return ctx.badRequest(
          `Este usuario ya pertenece a una agencia (${existing.agencia.nombre || existing.agencia.id}). Debe darse de baja de esa agencia antes de poder agregarlo aquí.`
        );
      }
      if (existing.agencia && Number(existing.agencia.id) === Number(agenciaId)) {
        return ctx.badRequest('Este usuario ya es socio de tu agencia');
      }

      user = await strapi.db.query(USER_UID).update({
        where: { id: existing.id },
        data: {
          agencia: agenciaId,
          roles: { extra },
          confirmed: true,
        },
      });
    } else {
      // Crear nuevo usuario (provider auth0, sin password real — Auth0 gestiona auth)
      user = await strapi.db.query(USER_UID).create({
        data: {
          email,
          username: username || email,
          confirmed: true,
          blocked: false,
          provider: 'auth0',
          agencia: agenciaId,
          roles: { extra },
        },
      });
    }

    // 3. Recargar el usuario con la relación agencia populada
    const populated = await strapi.db.query(USER_UID).findOne({
      where: { id: user.id },
      populate: { agencia: true },
    });

    ctx.body = {
      ok: true,
      message: existing
        ? 'Socio actualizado correctamente'
        : 'Socio creado y asignado a la agencia',
      data: {
        id: populated.id,
        email: populated.email,
        username: populated.username,
        agencia: populated.agencia
          ? { id: populated.agencia.id, nombre: populated.agencia.nombre }
          : null,
        roles: populated.roles || { extra },
      },
    };
  },
};

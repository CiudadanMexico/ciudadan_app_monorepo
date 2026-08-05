'use strict';

/**
 * POST /api/agencias/:id/socios
 *
 * Da de alta (o actualiza) un usuario como socio miembro de una agencia.
 * Body: { email, username?, roles_extra? }
 *   - email:        obligatorio. Si el usuario no existe, se crea.
 *   - username:     opcional. Si no se envía, se usa el email.
 *   - roles_extra:  opcional. Array de roles extra (por defecto ['socio']).
 *
 * Solo admin/socio pueden invocar (policy global::is-admin-or-socio).
 * El usuario autenticado queda en ctx.state.strapiUser (lo setea la policy).
 */

const USER_UID = 'plugin::users-permissions.user';
const AGENCIA_UID = 'api::agencia.agencia';

module.exports = {
  async agregarSocio(ctx) {
    const { id: agenciaId } = ctx.params;
    const { email, username, roles_extra } = ctx.request.body || {};

    if (!agenciaId) {
      return ctx.badRequest('Falta el id de la agencia');
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return ctx.badRequest('Email inválido');
    }

    // 1. Verificar que la agencia existe
    const agencia = await strapi.entityService.findOne(AGENCIA_UID, agenciaId);
    if (!agencia) {
      return ctx.notFound('Agencia no encontrada');
    }

    // 2. Buscar usuario por email; crearlo si no existe
    const existing = await strapi.db.query(USER_UID).findOne({ where: { email } });

    let user;
    const extra = Array.isArray(roles_extra) && roles_extra.length > 0
      ? roles_extra
      : ['socio'];

    if (existing) {
      // Actualizar: asignar agencia + roles.extra
      user = await strapi.db.query(USER_UID).update({
        where: { id: existing.id },
        data: {
          agencia: agenciaId,
          roles: { extra: extra },
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
          roles: { extra: extra },
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
        roles: populated.roles || { extra: extra },
      },
    };
  },
};

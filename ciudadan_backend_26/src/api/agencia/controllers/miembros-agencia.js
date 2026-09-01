'use strict';

/**
 * GET /api/agencias/mi-agencia/socios
 *
 * Lista los usuarios que ya pertenecen a la agencia del admin/socio
 * autenticado (chat.md: "deberías de mostrar los usuarios que pertenecen
 * ya a esta agencia... con su opción de darlos de baja"). Esta lista es la
 * que se usa para dar de baja (seleccionando de aquí, no buscando).
 */

const USER_UID = 'plugin::users-permissions.user';

module.exports = {
  async miembrosAgencia(ctx) {
    const caller = await strapi.db.query(USER_UID).findOne({
      where: { id: ctx.state.strapiUser.id },
      populate: { agencia: true },
    });
    const agenciaId = caller?.agencia?.id || null;
    if (!agenciaId) {
      ctx.body = { ok: true, data: [], agencia: null };
      return;
    }

    const miembros = await strapi.db.query(USER_UID).findMany({
      where: { agencia: agenciaId },
      select: ['id', 'email', 'username', 'roles'],
      orderBy: { email: 'asc' },
    });

    ctx.body = {
      ok: true,
      agencia: { id: caller.agencia.id, nombre: caller.agencia.nombre },
      data: miembros.map((u) => ({
        id: u.id,
        email: u.email,
        username: u.username,
        roles: u.roles || { extra: [] },
      })),
    };
  },
};

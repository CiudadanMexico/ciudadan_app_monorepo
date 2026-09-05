'use strict';

/**
 * POST /api/agencias/mi-agencia/socios/:userId/baja
 *
 * Quita a un usuario de la agencia del admin/socio autenticado (chat.md:
 * "no es buscar a qué correo vas a borrar, sino... los seleccionas" de la
 * lista de miembros — sin confirmación por correo ni por nombre escrito,
 * la decisión final de la llamada descarta esas dos ideas intermedias).
 *
 * Solo puede dar de baja a alguien de SU PROPIA agencia (no de otras).
 */

const USER_UID = 'plugin::users-permissions.user';

module.exports = {
  async bajaSocio(ctx) {
    const { userId } = ctx.params;
    if (!userId) {
      return ctx.badRequest('Falta el id del usuario');
    }

    const caller = await strapi.db.query(USER_UID).findOne({
      where: { id: ctx.state.strapiUser.id },
      populate: { agencia: true },
    });
    const agenciaId = caller?.agencia?.id || null;
    if (!agenciaId) {
      return ctx.badRequest('Tu cuenta no tiene una agencia asignada');
    }

    const target = await strapi.db.query(USER_UID).findOne({
      where: { id: userId },
      populate: { agencia: true },
    });
    if (!target) {
      return ctx.notFound('Usuario no encontrado');
    }
    if (!target.agencia || Number(target.agencia.id) !== Number(agenciaId)) {
      return ctx.badRequest('Este usuario no pertenece a tu agencia');
    }

    await strapi.db.query(USER_UID).update({
      where: { id: target.id },
      data: { agencia: null },
    });

    ctx.body = {
      ok: true,
      message: 'Socio dado de baja de la agencia correctamente',
    };
  },
};

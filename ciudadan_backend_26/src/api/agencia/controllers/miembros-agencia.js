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
      agencia: {
        id: caller.agencia.id,
        nombre: caller.agencia.nombre,
        // docs/COWORK-VERIFICACION-CONDUCTORES-FASES.md: reputación de
        // agencia, de solo lectura — la calcula/actualiza el módulo de
        // Taxis a partir de eventos de auditoría, nunca el frontend.
        reputacion: {
          total_verifications: caller.agencia.total_verifications || 0,
          total_audited: caller.agencia.total_audited || 0,
          conforming: caller.agencia.conforming || 0,
          inconsistencies: caller.agencia.inconsistencies || 0,
          critical_findings: caller.agencia.critical_findings || 0,
          reverifications: caller.agencia.reverifications || 0,
          trust_score: caller.agencia.trust_score || 0,
        },
      },
      data: miembros.map((u) => ({
        id: u.id,
        email: u.email,
        username: u.username,
        roles: u.roles || { extra: [] },
      })),
    };
  },
};

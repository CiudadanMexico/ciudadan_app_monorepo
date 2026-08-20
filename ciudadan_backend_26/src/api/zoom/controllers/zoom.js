"use strict";

module.exports = {
  async getAccount(ctx) {
    const currentUser = ctx.state.user;

    if (currentUser) {
      strapi.log.info(
        `[ZoomController] Consulta solicitada por usuario: ${currentUser.email}`
      );
    }

    const data = await strapi.service("api::zoom.zoom").getAccountProfile();

    return ctx.send({
      success: true,
      data,
    });
  },
  async getMeetings(ctx) {
    try {
      const data = await strapi.service("api::zoom.zoom").getUpcomingMeetings();

      return ctx.send({
        success: true,
        data,
      });
    } catch (error) {
      strapi.log.error("[ZoomController] Error al obtener reuniones:", error);
      return ctx.badRequest("No se pudieron obtener las reuniones de Zoom.");
    }
  },
};

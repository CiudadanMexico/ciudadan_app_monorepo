'use strict';

/**
 * Controller del MVP de cotizaciones de envío para Food.
 *
 * La identidad viene de la policy Auth0 (ctx.state.strapiUser). El controller
 * no confía en ningún dato crítico del body (usuario, importes, distancias):
 * todo lo resuelve el servicio desde fuentes autorizadas.
 */

const { cotizar } = require('../services/cotizacion-service');

module.exports = {
  /**
   * POST /api/food-shipping/cotizar
   * body: { foodCartId? , foodOrderId?, direccionDestinoId?, direccionDestino? }
   */
  async cotizar(ctx) {
    const usuario = ctx.state?.strapiUser;
    if (!usuario?.id || !usuario.email) {
      return ctx.unauthorized('Debes iniciar sesión para cotizar el envío');
    }

    const { foodCartId, foodOrderId, direccionDestinoId, direccionDestino } =
      ctx.request.body || {};

    try {
      const resultado = await cotizar({
        usuario,
        foodCartId,
        foodOrderId,
        direccionDestinoId,
        direccionDestino,
      });
      return ctx.send(resultado);
    } catch (error) {
      const status = Number(error?.status);
      const mensaje = error?.expose
        ? error.message
        : 'No fue posible obtener las cotizaciones de envío';

      strapi.log.error(
        `[food-shipping] Error al cotizar: ${String(error?.message || error).slice(0, 300)}`
      );

      if (status === 400) return ctx.badRequest(mensaje);
      if (status === 403) return ctx.forbidden(mensaje);
      if (status === 404) return ctx.notFound(mensaje);
      if (status === 409) return ctx.conflict(mensaje);
      return ctx.internalServerError(mensaje);
    }
  },
};

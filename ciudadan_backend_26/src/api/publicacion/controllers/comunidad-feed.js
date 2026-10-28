'use strict';

/**
 * Controlador del feed público de la comunidad: GET /api/comunidades/publicaciones
 *
 * Acepta `?page=` y `?pageSize=` (both opcionales) y responde con el mismo
 * sobre que el core router de Strapi:
 *   { data: [...], meta: { pagination: { page, pageSize, pageCount, total } } }
 */

const PAGE_SIZE_POR_DEFECTO = 10;
const PAGE_SIZE_MAXIMO = 25;

function leerEntero(valor, porDefecto, minimo, maximo) {
  const numero = Number.parseInt(Array.isArray(valor) ? valor[0] : valor, 10);
  if (!Number.isFinite(numero)) return porDefecto;
  return Math.min(Math.max(numero, minimo), maximo);
}

module.exports = {
  async listar(ctx) {
    const page = leerEntero(ctx.query.page, 1, 1, 100000);
    const pageSize = leerEntero(
      ctx.query.pageSize,
      PAGE_SIZE_POR_DEFECTO,
      1,
      PAGE_SIZE_MAXIMO
    );

    const { items, total } = await strapi
      .service('api::publicacion.comunidad-feed')
      .listar({ page, pageSize });

    const pageCount = total === 0 ? 1 : Math.ceil(total / pageSize);

    ctx.body = {
      data: items,
      meta: {
        pagination: { page, pageSize, pageCount, total },
      },
    };
  },
};

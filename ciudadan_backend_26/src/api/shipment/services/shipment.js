'use strict';

/**
 * shipment service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::shipment.shipment', ({ strapi }) => ({
  /**
   * Valida que las cantidades empacadas coincidan exactamente con las
   * cantidades del pedido (regla: el backend es la fuente de verdad).
   *
   * @param {Array} orderItems - Items del pedido (componente carritos.producto-en-carrito).
   * @param {Array} packages   - Paquetes propuestos: [{ items: [{ order_item_id?, producto_id, quantity }] }]
   * @throws {Error} si sobran o faltan unidades de algún producto.
   */
  validatePackingAgainstOrder(orderItems = [], packages = []) {
    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      throw new Error('El pedido no tiene productos');
    }

    if (!Array.isArray(packages) || packages.length === 0) {
      throw new Error('Debe proporcionar al menos un paquete');
    }

    // Cantidades esperadas por producto (a partir del pedido)
    const expected = new Map();
    for (const item of orderItems) {
      const productoId = Number(item?.producto?.id ?? item?.producto ?? item?.producto_id);
      const cantidad = Number(item?.cantidad) || 0;

      if (!Number.isInteger(productoId) || productoId <= 0 || cantidad <= 0) continue;

      expected.set(productoId, (expected.get(productoId) ?? 0) + cantidad);
    }

    // Cantidades empacadas por producto
    const packed = new Map();
    for (const [pkgIndex, pkg] of packages.entries()) {
      const items = Array.isArray(pkg?.items) ? pkg.items : [];

      if (items.length === 0) {
        throw new Error(`El paquete ${pkgIndex + 1} no contiene productos`);
      }

      for (const item of items) {
        const productoId = Number(item?.producto_id ?? item?.producto);
        const quantity = Number(item?.quantity);

        if (!Number.isInteger(productoId) || productoId <= 0) {
          throw new Error(`producto_id inválido en el paquete ${pkgIndex + 1}`);
        }

        if (!Number.isInteger(quantity) || quantity <= 0) {
          throw new Error(`quantity inválida para el producto ${productoId} en el paquete ${pkgIndex + 1}`);
        }

        packed.set(productoId, (packed.get(productoId) ?? 0) + quantity);
      }
    }

    // Comparar ambos mapas
    for (const [productoId, cantidadEsperada] of expected) {
      const cantidadEmpacada = packed.get(productoId) ?? 0;

      if (cantidadEmpacada !== cantidadEsperada) {
        throw new Error(
          `El producto ${productoId} tiene ${cantidadEsperada} unidades en el pedido pero ${cantidadEmpacada} empacadas`
        );
      }
    }

    for (const productoId of packed.keys()) {
      if (!expected.has(productoId)) {
        throw new Error(`El producto ${productoId} no pertenece al pedido`);
      }
    }

    return true;
  },
}));

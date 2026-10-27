'use strict';

/**
 * Lifecycles de food-order — revalidación de cotizaciones de envío (MVP).
 *
 * El punto de confirmación de compra existente es POST /api/food-orders
 * (CRUD core). Este beforeCreate actúa SOLO cuando el payload trae
 * metadata.cotizacion_envio.codigo (contrato nuevo del checkout); el flujo
 * legacy con metadata.uber_direct sigue funcionando exactamente igual
 * (cero regresión).
 *
 * Qué garantiza el ciclo de vida:
 *  - La cotización se revalida en servidor: propiedad, vigencia, restaurante,
 *    destino, huella del carrito y disponibilidad (ciudadan).
 *  - La cotización se consume ATÓMICAMENTE (update condicional): dos
 *    confirmaciones concurrentes con la misma cotización no pueden ganar
 *    ambas; los reintentos de duplicar pedido chocan con 409.
 *  - monto_envio se sobrescribe SIEMPRE desde la cotización y monto_total se
 *    recalcula en servidor (Σ subtotal de items + envío): el cliente no puede
 *    alterar el precio del envío ni el total.
 */

const {
  validarYConsumarCotizacionParaOrden,
  enlazarCotizacionConOrden,
} = require('../../../food-shipping/services/cotizacion-service');
const { redondearMoneda } = require('../../../food-shipping/utils/tarifa');

/** Suma los subtotales de los items del payload (componente orders.products-order). */
function subtotalItems(items) {
  let itemsLista = items;
  if (typeof itemsLista === 'string') {
    try {
      itemsLista = JSON.parse(itemsLista);
    } catch {
      itemsLista = [];
    }
  }
  if (!Array.isArray(itemsLista)) return 0;
  return itemsLista.reduce((acum, item) => {
    const subtotal = Number(item?.subtotal);
    return acum + (Number.isFinite(subtotal) ? subtotal : 0);
  }, 0);
}

module.exports = {
  async beforeCreate(event) {
    const data = event.params?.data;
    if (!data || !data.metadata?.cotizacion_envio?.codigo) {
      return; // flujo legacy: sin cambios
    }

    const cotizacion = await validarYConsumarCotizacionParaOrden(data);

    // Importe autoritativo: el frontend no decide el precio del envío.
    const importeEnvio = Number(cotizacion.importe);
    data.monto_envio = importeEnvio;
    data.monto_total = redondearMoneda(subtotalItems(data.items) + importeEnvio);
    if (!data.moneda) {
      data.moneda = cotizacion.moneda || 'MXN';
    }

    // Huella de la confirmación para trazabilidad (/mine, verify-payment).
    data.metadata = {
      ...data.metadata,
      cotizacion_envio_confirmada: {
        cotizacionId: cotizacion.codigo,
        proveedor: cotizacion.provider,
        importe: importeEnvio,
        moneda: cotizacion.moneda || 'MXN',
        distanciaMetros: cotizacion.distancia_metros ?? null,
        confirmadaEn: new Date().toISOString(),
      },
    };
  },

  async afterCreate(event) {
    const codigo = event.result?.metadata?.cotizacion_envio?.codigo;
    const ordenId = event.result?.id;
    if (!codigo || !ordenId) return;

    // Best-effort: enlaza la cotización consumida con la orden creada.
    await enlazarCotizacionConOrden({ codigo, foodOrderId: ordenId });
  },
};

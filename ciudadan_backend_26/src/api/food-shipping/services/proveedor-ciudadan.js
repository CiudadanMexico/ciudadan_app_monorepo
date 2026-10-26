'use strict';

/**
 * Proveedor Ciudadan para el MVP de cotizaciones de envío Food.
 *
 * Reglas (spec §1.2):
 *  - Distancia de entrega POR CALLES restaurante→cliente (servicio de rutas).
 *    Sin ruta válida NO hay cotización (fail-closed).
 *  - Máximo 10 km de entrega; bicicleta, bicicleta eléctrica y motocicleta
 *    comparten el mismo límite (no hay cargos por vehículo en el MVP).
 *  - Tarifa: max(30, 20 + 5·D) MXN con D en km fraccionarios (utils/tarifa.js).
 *  - Requiere al menos un repartidor ELEGIBLE dentro de 10 km del restaurante
 *    (repartidores-service). Cotizar NO asigna ni reserva repartidores.
 */

const rutas = require('../../../services/rutas');

const { PROVEEDORES, CODIGOS_INDISPONIBILIDAD } = require('../utils/constants');
const { calcularTarifaDesdeMetros, estaDentroDeCobertura } = require('../utils/tarifa');
const { buscarRepartidoresElegibles } = require('./repartidores-service');

function indisponible(codigo) {
  return {
    proveedor: PROVEEDORES.CIUDADAN,
    disponible: false,
    codigoIndisponibilidad: codigo,
    mensaje: CODIGOS_INDISPONIBILIDAD[codigo] || CODIGOS_INDISPONIBILIDAD.RUTA_NO_DISPONIBLE,
  };
}

/**
 * Cotiza una entrega con repartidores de Ciudadan.
 * @param {object} params
 * @param {{lat:number,lng:number}} params.origenCoords coordenadas del restaurante
 * @param {{lat:number,lng:number}} params.destinoCoords coordenadas del cliente
 * @returns {Promise<object>} disponibilidad normalizada del proveedor
 */
async function cotizarCiudadan({ origenCoords, destinoCoords }) {
  if (!rutas.coordenadasValidas(origenCoords || {})) {
    return indisponible('ORIGEN_SIN_COORDENADAS');
  }
  if (!rutas.coordenadasValidas(destinoCoords || {})) {
    return indisponible('DESTINO_SIN_COORDENADAS');
  }

  let ruta;
  try {
    ruta = await rutas.obtenerDistanciaRuta({ origen: origenCoords, destino: destinoCoords });
  } catch (error) {
    // Fail-closed: sin ruta por calles no se inventa distancia ni cotización.
    strapi.log.warn(
      `[food-shipping] Ruta no disponible: ${String(error?.codigo || error?.message || error).slice(0, 200)}`
    );
    return indisponible('RUTA_NO_DISPONIBLE');
  }

  if (!estaDentroDeCobertura(ruta.distanciaMetros)) {
    return indisponible('FUERA_DE_COBERTURA');
  }

  const { total, descartes } = await buscarRepartidoresElegibles(origenCoords);
  if (!total) {
    strapi.log.info('[food-shipping] Sin repartidores elegibles cerca del restaurante');
    return indisponible('SIN_REPARTIDORES');
  }

  return {
    proveedor: PROVEEDORES.CIUDADAN,
    disponible: true,
    importe: calcularTarifaDesdeMetros(ruta.distanciaMetros),
    moneda: 'MXN',
    distanciaMetros: ruta.distanciaMetros,
    referencia: null, // tarifa propia: no hay referencia externa
    vence: null, // lo fija el orquestador (vigencia de la cotización)
    simulado: false,
    detalle: {
      repartidoresDisponibles: total,
      duracionSegundos: ruta.duracionSegundos || null,
      proveedorRutas: ruta.proveedor,
      descartes,
    },
  };
}

module.exports = { cotizarCiudadan };

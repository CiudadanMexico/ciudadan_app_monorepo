'use strict';

/**
 * Tarifa de envío de Ciudadan para Food (MVP cotizaciones).
 *
 * Regla de negocio acordada (spec §1):
 *
 *   envio = max(30, 20 + 5 * D)
 *
 * donde D es la distancia POR CALLES del restaurante al cliente en kilómetros
 * y el importe se expresa en MXN.
 *
 * PRECISIÓN (definida por el MVP, ver docs/FOOD-COTIZACIONES-ENVIO-MVP.md):
 * - La distancia de ruta llega del proveedor en METROS (float) y se persiste
 *   como entero de metros (redondeo al metro más cercano).
 * - D = metros / 1000. NO se redondea la distancia a kilómetros enteros
 *   antes de aplicar la fórmula.
 * - El importe se redondea a 2 decimales (centavos) con redondeo half-up
 *   (Math.round con corrección de punto flotante).
 * - El límite de cobertura es 10 km POR CALLES; 10.0 km exactos sigue siendo
 *   cobertura válida ($70).
 *
 * Referencias de la spec: 1 km = $30; 2 km = $30; 3 km = $35; 5 km = $45;
 * 8 km = $60; 10 km = $70.
 */

const TARIFA_BASE_MXN = 20;
const TARIFA_POR_KM_MXN = 5;
const TARIFA_MINIMA_MXN = 30;
const DISTANCIA_MAXIMA_ENTREGA_METROS = 10000;

/** Redondeo monetario a 2 decimales (half-up, tolerante a punto flotante). */
function redondearMoneda(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) {
    throw new Error('redondearMoneda espera un número finito');
  }
  return Math.round((numero + Number.EPSILON) * 100) / 100;
}

/** Kilómetros fraccionarios desde metros, SIN redondeo previo. */
function kmDesdeMetros(metros) {
  return Number(metros) / 1000;
}

/**
 * Tarifa Ciudadan en MXN a partir de la distancia de ruta en metros.
 * Lanza Error plano (400/expose) si la distancia no es un número válido.
 */
function calcularTarifaDesdeMetros(metros) {
  const numero = Number(metros);
  if (!Number.isFinite(numero) || numero < 0) {
    const error = new Error('Distancia de ruta inválida para calcular la tarifa');
    error.status = 400;
    error.expose = true;
    throw error;
  }
  const bruta = Math.max(
    TARIFA_MINIMA_MXN,
    TARIFA_BASE_MXN + TARIFA_POR_KM_MXN * kmDesdeMetros(numero)
  );
  return redondearMoneda(bruta);
}

/** true cuando la distancia de entrega (metros) está dentro del límite de 10 km. */
function estaDentroDeCobertura(metros) {
  const numero = Number(metros);
  return Number.isFinite(numero) && numero >= 0 && numero <= DISTANCIA_MAXIMA_ENTREGA_METROS;
}

module.exports = {
  TARIFA_BASE_MXN,
  TARIFA_POR_KM_MXN,
  TARIFA_MINIMA_MXN,
  DISTANCIA_MAXIMA_ENTREGA_METROS,
  redondearMoneda,
  kmDesdeMetros,
  calcularTarifaDesdeMetros,
  estaDentroDeCobertura,
};

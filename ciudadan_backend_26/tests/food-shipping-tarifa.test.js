'use strict';

/**
 * Fórmula de tarifa Ciudadan (MVP cotizaciones Food) — utils/tarifa.js.
 * Spec §1.2: envio = max(30, 20 + 5·D) MXN, D = km fraccionarios POR CALLES.
 * Referencias: 1 km=$30, 2 km=$30, 3 km=$35, 5 km=$45, 8 km=$60, 10 km=$70.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  calcularTarifaDesdeMetros,
  estaDentroDeCobertura,
  kmDesdeMetros,
  redondearMoneda,
  DISTANCIA_MAXIMA_ENTREGA_METROS,
} = require('../src/api/food-shipping/utils/tarifa');

test('fórmula de referencia de la spec: 1, 2, 3, 5, 8 y 10 km', () => {
  assert.equal(calcularTarifaDesdeMetros(1000), 30);
  assert.equal(calcularTarifaDesdeMetros(2000), 30);
  assert.equal(calcularTarifaDesdeMetros(3000), 35);
  assert.equal(calcularTarifaDesdeMetros(5000), 45);
  assert.equal(calcularTarifaDesdeMetros(8000), 60);
  assert.equal(calcularTarifaDesdeMetros(10000), 70);
});

test('distancias fraccionarias SIN redondear a km enteros', () => {
  // 3.25 km => 20 + 16.25 = 36.25 (no 36 ni 35)
  assert.equal(calcularTarifaDesdeMetros(3250), 36.25);
  // 5.1 km => 20 + 25.5 = 45.5
  assert.equal(calcularTarifaDesdeMetros(5100), 45.5);
  // 7.3 km => 20 + 36.5 = 56.5
  assert.equal(calcularTarifaDesdeMetros(7300), 56.5);
  // 2.102 km => 20 + 10.51 = 30.51 (el mínimo ya no domina)
  assert.equal(calcularTarifaDesdeMetros(2102), 30.51);
  // 2.75 km => 20 + 13.75 = 33.75
  assert.equal(calcularTarifaDesdeMetros(2750), 33.75);
});

test('mínimo de $30 domina distancias cortas', () => {
  assert.equal(calcularTarifaDesdeMetros(0), 30);
  assert.equal(calcularTarifaDesdeMetros(1), 30);
  assert.equal(calcularTarifaDesdeMetros(999), 30);
  assert.equal(calcularTarifaDesdeMetros(1999), 30);
});

test('precisión monetaria: importe a 2 decimales', () => {
  assert.equal(redondearMoneda(36.256), 36.26);
  assert.equal(redondearMoneda(45.611), 45.61);
  assert.equal(calcularTarifaDesdeMetros(1234), 30); // 20+6.17=26.17 -> mínimo 30
  assert.equal(calcularTarifaDesdeMetros(2345), redondearMoneda(20 + 11.725));
  // km con 3 decimales: 3.255 km => 20 + 16.275 => 36.28 (half-up)
  assert.equal(calcularTarifaDesdeMetros(3255), 36.28);
});

test('cobertura: límite exacto de 10 km válido, un metro más ya no', () => {
  assert.equal(DISTANCIA_MAXIMA_ENTREGA_METROS, 10000);
  assert.ok(estaDentroDeCobertura(10000), '10.0 km exactos sigue en cobertura');
  assert.ok(!estaDentroDeCobertura(10001), '10.001 km queda fuera');
  assert.ok(estaDentroDeCobertura(0));
  assert.ok(!estaDentroDeCobertura(-1));
  assert.ok(!estaDentroDeCobertura('basura'));
});

test('km fraccionarios desde metros (sin redondeo previo)', () => {
  assert.equal(kmDesdeMetros(3250), 3.25);
  assert.equal(kmDesdeMetros(10000), 10);
});

test('distancia inválida: error plano 400', () => {
  assert.throws(() => calcularTarifaDesdeMetros('abc'), (e) => e.status === 400);
  assert.throws(() => calcularTarifaDesdeMetros(-5), (e) => e.status === 400);
  assert.throws(() => calcularTarifaDesdeMetros(NaN), (e) => e.status === 400);
});

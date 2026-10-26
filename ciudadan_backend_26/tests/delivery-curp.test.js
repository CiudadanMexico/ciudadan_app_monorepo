'use strict';

/**
 * CURP + mayoria de edad del MVP repartidores: estructura de 18 posiciones,
 * fecha real extraida, consistencia con la fecha declarada, >= 18 anios.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizarCurp,
  curpValida,
  fechaNacimientoDeCurp,
  edadEnFecha,
  validarIdentidad,
} = require('../src/api/delivery-registration/utils/curp');

// Garcia Rodriguez Carlos, 20/05/1990, hombre, CDMX (DF).
const CURP_VALIDA = 'GARC900520HDFRRT09';
const CURP_2010 = 'GARC100520HDFRRT09';

test('normalizarCurp mayuscula y limpia', () => {
  assert.equal(normalizarCurp('  garc900520hdfr rt-09 '), 'GARC900520HDFRRT09');
  assert.equal(normalizarCurp('corto'), null);
  assert.equal(normalizarCurp(null), null);
});

test('curpValida acepta estructuras correctas', () => {
  assert.equal(curpValida(CURP_VALIDA), true);
  assert.equal(curpValida('GARC000229MDFNRR09'), true); // fecha real: 29-feb-2000
  assert.equal(curpValida('GARC900520HDFRRT09'.toLowerCase()), true);
});

test('curpValida rechaza estructura y entidad invalidas', () => {
  assert.equal(curpValida('GARC900520XDFRRT09'), false); // sexo invalido
  assert.equal(curpValida('GARC900520HDZZRRT09'), false); // entidad inexistente
  assert.equal(curpValida('GARC900520HDFARt09'.slice(0, 17) + '9'), false); // vocal en consonantes
  assert.equal(curpValida('GARC900520'), false); // corta
  assert.equal(curpValida(''), false);
  assert.equal(curpValida(null), false);
});

test('fechaNacimientoDeCurp extrae fechas reales y rechaza imposibles', () => {
  const fecha = fechaNacimientoDeCurp(CURP_VALIDA);
  assert.equal(fecha.getUTCFullYear(), 1990);
  assert.equal(fecha.getUTCMonth(), 4);
  assert.equal(fecha.getUTCDate(), 20);

  assert.equal(fechaNacimientoDeCurp('GARC900230HDFRRT09'), null); // 30-feb
  assert.equal(fechaNacimientoDeCurp('GARC901320HDFRRT09'), null); // mes 13
  assert.equal(fechaNacimientoDeCurp('XYZ'), null);
});

test('edadEnFecha calcula anios cumplidos', () => {
  const nac = new Date('1990-05-20T00:00:00Z');
  assert.equal(edadEnFecha(nac, new Date('2026-10-22T00:00:00Z')), 36);
  assert.equal(edadEnFecha(nac, new Date('2026-05-19T00:00:00Z')), 35);
  assert.equal(edadEnFecha(nac, new Date('2026-05-20T00:00:00Z')), 36);
  assert.equal(edadEnFecha('no-fecha', new Date()), null);
});

test('validarIdentidad aprueba mayor de edad con CURP consistente', () => {
  const res = validarIdentidad({ curp: CURP_VALIDA, birthdate: '1990-05-20' });
  assert.equal(res.ok, true);
  assert.equal(res.edad, 36);
  assert.deepEqual(res.errores, []);
});

test('validarIdentidad rechaza menores de 18', () => {
  const res = validarIdentidad({ curp: CURP_2010, birthdate: '2010-05-20' });
  assert.equal(res.ok, false);
  assert.ok(res.errores.some((e) => e.includes('18')));
});

test('validarIdentidad detecta inconsistencia CURP vs fecha declarada', () => {
  const res = validarIdentidad({ curp: CURP_VALIDA, birthdate: '1991-05-20' });
  assert.equal(res.ok, false);
  assert.ok(res.errores.some((e) => e.includes('no coincide')));
});

test('validarIdentidad exige CURP', () => {
  const res = validarIdentidad({ curp: '', birthdate: '1990-05-20' });
  assert.equal(res.ok, false);
  assert.ok(res.errores.some((e) => e.includes('CURP requerida')));
});

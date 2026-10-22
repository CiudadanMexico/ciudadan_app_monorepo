'use strict';

/**
 * CLABE del MVP repartidores: 18 digitos + dígito de control, institucion,
 * enmascaramiento. La CLABE completa jamas sale del backend.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  clabeValida,
  normalizarClabe,
  clabeLast4,
  enmascararClabe,
  institucionDeClabe,
  validarClabe,
} = require('../src/api/delivery-registration/utils/clabe');

// Vector valido verificado a mano contra el algoritmo estandar (Banamex 002):
// suma ponderada de los primeros 17 digitos = 211 -> control (10-1)%10 = 9.
const CLABE_VALIDA = '002180000123456789';
const CLABE_VALIDA_BANCOMER = '012180001234567899';

test('clabeValida acepta CLABEs con checksum correcto', () => {
  assert.equal(clabeValida(CLABE_VALIDA), true);
  assert.equal(clabeValida(CLABE_VALIDA_BANCOMER), true);
});

test('clabeValida rechaza dígito de control incorrecto', () => {
  assert.equal(clabeValida('002180000123456780'), false); // control alterado
  assert.equal(clabeValida('002180000123456781'), false);
});

test('clabeValida rechaza longitud y caracteres invalidos', () => {
  assert.equal(clabeValida('0021800001234567'), false); // 17 digitos
  assert.equal(clabeValida('0021800001234567890'), false); // 19 digitos
  assert.equal(clabeValida('00218000012345678A'), false);
  assert.equal(clabeValida(''), false);
  assert.equal(clabeValida(null), false);
  assert.equal(clabeValida(218000123), false);
});

test('normalizarClabe limpia espacios y guiones', () => {
  assert.equal(normalizarClabe(' 002 180 000 123 456 789 '), CLABE_VALIDA);
  assert.equal(normalizarClabe('002-1800-0012-3456-789'), CLABE_VALIDA);
  assert.equal(normalizarClabe('no-un-dígito'), null);
});

test('clabeLast4 y enmascararClabe solo exponen los ultimos 4', () => {
  assert.equal(clabeLast4(CLABE_VALIDA), '6789');
  assert.equal(enmascararClabe(CLABE_VALIDA), '**************6789');
  assert.ok(!enmascararClabe(CLABE_VALIDA).includes('0021'), 'el prefijo no debe verse');
  assert.equal(clabeLast4('123'), null);
});

test('institucionDeClabe resuelve prefijos catalogados y devuelve null en basura', () => {
  assert.ok(institucionDeClabe(CLABE_VALIDA).includes('Banamex'));
  assert.ok(institucionDeClabe(CLABE_VALIDA_BANCOMER).includes('BBVA'));
  assert.equal(institucionDeClabe('00218000012345678A'), null);
  assert.equal(institucionDeClabe(null), null);
  // El caso "prefijo numerico no catalogado" se cubre en el ultimo test.
});

test('validarClabe integra todo y exige checksum', () => {
  const ok = validarClabe(CLABE_VALIDA);
  assert.equal(ok.ok, true);
  assert.equal(ok.last4, '6789');
  assert.equal(ok.errores.length, 0);
  assert.ok(ok.institucion);

  const malChecksum = validarClabe('002180000123456780');
  assert.equal(malChecksum.ok, false);
  assert.ok(malChecksum.errores.some((e) => e.includes('dígito de control')));

  const corta = validarClabe('123');
  assert.equal(corta.ok, false);
  assert.ok(corta.errores.some((e) => e.includes('18')));
});

test('validarClabe reporta prefijo no catalogado sin rechazar la CLABE', () => {
  // 17 digitos con prefijo 998 y control calculado con el mismo algoritmo.
  const pesos = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7];
  const digitos = '99818000012345678'.split('').map(Number);
  const suma = digitos.reduce((acc, d, i) => acc + d * pesos[i], 0);
  const control = (10 - (suma % 10)) % 10;
  const clabe = `99818000012345678${control}`;

  const res = validarClabe(clabe);
  assert.equal(res.ok, true, 'el checksum es correcto');
  assert.ok(
    res.errores.some((e) => e.includes('no catalogado')),
    'deja constancia para revision humana'
  );
  assert.equal(res.institucion, null);
});

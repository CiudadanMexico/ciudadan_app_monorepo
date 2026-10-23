'use strict';

/**
 * URL de sesion Zoom (spec §12F): HTTPS, dominio permitido, sin credenciales
 * ni contrasenas/tokens incrustados.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { validarUrlZoom } = require('../src/api/delivery-registration/utils/zoom-url');

test('acepta enlaces https de zoom.us con subdominios', () => {
  assert.equal(validarUrlZoom('https://us02web.zoom.us/j/123456789').ok, true);
  assert.equal(validarUrlZoom('https://zoom.us/j/987654321?uname=repartidor').ok, true);
});

test('rechaza http, dominios ajenos y basura', () => {
  assert.equal(validarUrlZoom('http://us02web.zoom.us/j/123').ok, false);
  assert.equal(validarUrlZoom('https://evil-zoom.example.com/j/123').ok, false);
  assert.equal(validarUrlZoom('https://zoom.us.evil.com/j/123').ok, false, 'sufijo falso');
  assert.equal(validarUrlZoom('no-es-url').ok, false);
  assert.equal(validarUrlZoom('').ok, false);
  assert.equal(validarUrlZoom(null).ok, false);
});

test('rechaza contrasenas y tokens en el enlace', () => {
  assert.equal(validarUrlZoom('https://us02web.zoom.us/j/123?pwd=abc123').ok, false);
  assert.equal(validarUrlZoom('https://us02web.zoom.us/j/123?token=xyz').ok, false);
  assert.equal(validarUrlZoom('https://user:pass@us02web.zoom.us/j/123').ok, false);
});

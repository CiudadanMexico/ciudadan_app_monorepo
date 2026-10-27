'use strict';

/**
 * Servicio de rutas por calles (src/services/rutas) — MVP cotizaciones Food.
 * Contratos Google Directions y OSRM con fetch parchado (sin red):
 * - distancia por calles en metros;
 * - fail-closed: sin ruta no hay distancia (NUNCA haversine de relleno);
 * - timeout configurable;
 * - sin llave de Google -> indisponible (no se inventa ruta).
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const rutas = require('../src/services/rutas');

const ORIGEN = { lat: 19.4326, lng: -99.1332 };
const DESTINO = { lat: 19.4500, lng: -99.1500 };

function parcharFetch(responder) {
  const original = global.fetch;
  global.fetch = responder;
  return () => {
    global.fetch = original;
  };
}

/** fetch falso que SÍ respeta el AbortSignal (como el fetch real). */
function fetchConAbort(payload, { ok = true } = {}) {
  return (url, { signal } = {}) =>
    new Promise((resolve, reject) => {
      const t = setTimeout(() => resolve({ ok, json: async () => payload }), 5);
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(t);
          reject(new Error('This operation was aborted'));
        });
      }
    });
}

const respuestaGoogle = (metros, segundos) => ({
  status: 'OK',
  routes: [{ legs: [{ distance: { value: metros }, duration: { value: segundos } }] }],
});

const respuestaOsrm = (metros, segundos, codigo = 'Ok') => ({
  code: codigo,
  routes: codigo === 'Ok' ? [{ distance: metros, duration: segundos }] : [],
});

test.afterEach(() => {
  delete process.env.RUTA_PROVEEDOR;
  delete process.env.RUTA_TIMEOUT_MS;
  delete process.env.GOOGLE_MAPS_API_KEY;
  delete process.env.GEOCODING_KEY;
  delete process.env.RUTA_GOOGLE_KEY;
});

test('google (default): distancia por calles de legs[].distance.value', async (t) => {
  process.env.GOOGLE_MAPS_API_KEY = 'test-key';
  const restaurar = parcharFetch(fetchConAbort(respuestaGoogle(5123, 900)));
  t.after(restaurar);

  const resultado = await rutas.obtenerDistanciaRuta({ origen: ORIGEN, destino: DESTINO });
  assert.equal(resultado.distanciaMetros, 5123);
  assert.equal(resultado.duracionSegundos, 900);
  assert.equal(resultado.proveedor, 'google');
});

test('google: usa GEOCODING_KEY (la llave presente en .env) si no hay otra', async (t) => {
  process.env.GEOCODING_KEY = 'geocoding-key';
  let urlCapturada = null;
  const restaurar = parcharFetch(async (url) => {
    urlCapturada = url;
    return { ok: true, json: async () => respuestaGoogle(1000, 100) };
  });
  t.after(restaurar);

  await rutas.obtenerDistanciaRuta({ origen: ORIGEN, destino: DESTINO });
  assert.ok(urlCapturada.includes('key=geocoding-key'), 'debe usar GEOCODING_KEY');
});

test('google sin llave: fail-closed RUTA_NO_DISPONIBLE (sin inventar ruta)', async (t) => {
  const restaurar = parcharFetch(fetchConAbort(respuestaGoogle(1000, 100)));
  t.after(restaurar);

  await assert.rejects(
    () => rutas.obtenerDistanciaRuta({ origen: ORIGEN, destino: DESTINO }),
    (e) => e.name === 'RutaError' && e.codigo === 'RUTA_NO_DISPONIBLE'
  );
});

test('google ZERO_RESULTS (ruta inexistente): fail-closed', async (t) => {
  process.env.GOOGLE_MAPS_API_KEY = 'test-key';
  const restaurar = parcharFetch(fetchConAbort({ status: 'ZERO_RESULTS', routes: [] }));
  t.after(restaurar);

  await assert.rejects(
    () => rutas.obtenerDistanciaRuta({ origen: ORIGEN, destino: DESTINO }),
    (e) => e.codigo === 'RUTA_NO_DISPONIBLE'
  );
});

test('osrm: distancia de routes[0].distance, redondeada a metros', async (t) => {
  process.env.RUTA_PROVEEDOR = 'osrm';
  const restaurar = parcharFetch(fetchConAbort(respuestaOsrm(5123.4, 905.7)));
  t.after(restaurar);

  const resultado = await rutas.obtenerDistanciaRuta({ origen: ORIGEN, destino: DESTINO });
  assert.equal(resultado.distanciaMetros, 5123);
  assert.equal(resultado.duracionSegundos, 906);
  assert.equal(resultado.proveedor, 'osrm');
});

test('osrm NoRoute: fail-closed, nunca sustituye por línea recta', async (t) => {
  process.env.RUTA_PROVEEDOR = 'osrm';
  const restaurar = parcharFetch(fetchConAbort(respuestaOsrm(0, 0, 'NoRoute')));
  t.after(restaurar);

  await assert.rejects(
    () => rutas.obtenerDistanciaRuta({ origen: ORIGEN, destino: DESTINO }),
    (e) => e.codigo === 'RUTA_NO_DISPONIBLE'
  );
});

test('proveedor de rutas caído (error de red): fail-closed', async (t) => {
  process.env.RUTA_PROVEEDOR = 'osrm';
  const restaurar = parcharFetch(async () => {
    throw new Error('ECONNREFUSED');
  });
  t.after(restaurar);

  await assert.rejects(
    () => rutas.obtenerDistanciaRuta({ origen: ORIGEN, destino: DESTINO }),
    (e) => e.codigo === 'RUTA_NO_DISPONIBLE'
  );
});

test('timeout del proveedor de rutas: fail-closed', async (t) => {
  process.env.RUTA_PROVEEDOR = 'osrm';
  process.env.RUTA_TIMEOUT_MS = '30';
  const restaurar = parcharFetch(
    (url, { signal } = {}) =>
      new Promise((_, reject) => {
        signal.addEventListener('abort', () => reject(new Error('aborted')));
        setTimeout(() => reject(new Error('nunca')), 500);
      })
  );
  t.after(restaurar);

  await assert.rejects(
    () => rutas.obtenerDistanciaRuta({ origen: ORIGEN, destino: DESTINO }),
    (e) => e.codigo === 'RUTA_NO_DISPONIBLE'
  );
});

test('coordenadas inválidas se rechazan antes de llamar al proveedor', async () => {
  await assert.rejects(
    () => rutas.obtenerDistanciaRuta({ origen: { lat: 999, lng: 0 }, destino: DESTINO }),
    (e) => e.codigo === 'RUTA_NO_DISPONIBLE'
  );
  await assert.rejects(
    () => rutas.obtenerDistanciaRuta({ origen: null, destino: DESTINO }),
    (e) => e.codigo === 'RUTA_NO_DISPONIBLE'
  );
  assert.ok(rutas.coordenadasValidas(ORIGEN));
  assert.ok(!rutas.coordenadasValidas({ lat: 'x', lng: 'y' }));
});

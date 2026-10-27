'use strict';

/**
 * Operación de cotización de envío Food (POST /api/food-shipping/cotizar):
 * - contrato de rutas (auth:false + policy Auth0; CRUD de cotizaciones cerrado);
 * - identidad y propiedad SIEMPRE del servidor (carrito/pedido/dirección);
 * - tablero normalizado por restaurante y proveedor + puedeContinuar;
 * - aislamiento de fallos: un proveedor caído no arrastra al otro; ningún
 *   proveedor disponible => puedeContinuar false;
 * - sin exposición de datos internos (quote_id de Uber, ids de repartidores).
 */

process.env.RUTA_PROVEEDOR = 'osrm';
process.env.UBER_DIRECT_TIMEOUT_MS = '80';
process.env.COTIZACION_VIGENCIA_MIN = '15';

const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { crearStrapiRepartidoresMock, crearCtxRepartidores } = require('./helpers/strapi-mock-repartidores');
const { UIDS } = require('../src/api/food-shipping/utils/constants');
const cotizacionService = require('../src/api/food-shipping/services/cotizacion-service');
const controller = require('../src/api/food-shipping/controllers/food-shipping');
const rutasCotizar = require('../src/api/food-shipping/routes/01-cotizar');

const COMPRADOR = { id: 7, email: 'comprador@ciudadan.org' };
const RESTAURANTE_COORDS = { lat: 19.4326, lng: -99.1332 };
const DESTINO_COORDS = { lat: 19.4500, lng: -99.1500 };

const respuestaOsrm = (metros) => ({ code: 'Ok', routes: [{ distance: metros, duration: 900 }] });

function parcharFetchOsrm(metros) {
  const original = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => respuestaOsrm(metros) });
  return () => {
    global.fetch = original;
  };
}

function uberQuoteCotizada({ fee = 75, id = 'ubq_secret_1', expiresMin = 10, mock = false } = {}) {
  return {
    quote: {
      id,
      fee,
      currency: 'mxn',
      expires: new Date(Date.now() + expiresMin * 60 * 1000).toISOString(),
      duration: 40,
      mock,
    },
  };
}

function montarCotizar({ uber = null, tablasExtra = {} } = {}) {
  const mock = crearStrapiRepartidoresMock({
    tablas: {
      [UIDS.USER]: [
        { id: 7, email: 'comprador@ciudadan.org', roles: { extra: [] } },
        { id: 20, email: 'repartidor@ciudadan.org', roles: { extra: ['repartidor'] } },
      ],
      [UIDS.FOOD_CART]: [
        {
          id: 12,
          usuario: 7,
          items: [
            { producto: { id: 101 }, variante: null, restaurante: 3, cantidad: 2, subtotal: 200 },
          ],
        },
        { id: 13, usuario: 9, items: [{ producto: { id: 102 }, restaurante: 3, cantidad: 1 }] },
      ],
      [UIDS.FOOD_ORDER]: [
        {
          id: 55,
          user: 7,
          status: 'pendiente_pago',
          restaurant: { id: 3 },
          items: [{ product: { id: 101 }, variant: null, cantidad: 2 }],
        },
      ],
      [UIDS.FOOD_RESTAURANT]: [{ id: 3, nombre: 'Tacos El Buda' }],
      [UIDS.DIRECCION]: [
        {
          id: 50,
          restaurant_id: 3,
          activa: true,
          coords: JSON.stringify(RESTAURANTE_COORDS),
          direccion: JSON.stringify({ street: 'Calle del restaurante', city: 'CDMX' }),
        },
        {
          id: 88,
          user_email: 'comprador@ciudadan.org',
          coords: JSON.stringify(DESTINO_COORDS),
          direccion: JSON.stringify({ street: 'Calle del cliente', city: 'CDMX' }),
        },
        { id: 89, user_email: 'otro@ciudadan.org', coords: JSON.stringify(DESTINO_COORDS) },
      ],
      [UIDS.DELIVERY_PROFILE]: [
        {
          id: 1,
          status: 'approved',
          user: { id: 20, roles: { extra: ['repartidor'] } },
          vehicles: [{ type: 'bicicleta', validation_status: 'verificado' }],
        },
      ],
      [UIDS.DRIVER_LOCATION]: [
        {
          id: 1,
          driver_id: 20,
          coords: JSON.stringify({ lat: 19.433, lng: -99.134 }),
          time: new Date().toISOString(),
        },
      ],
      [UIDS.COTIZACION]: [],
      ...tablasExtra,
    },
    servicios: {
      'api::uber-direct.uber-direct': {
        createDeliveryQuote: uber || (async () => uberQuoteCotizada()),
      },
    },
  });
  return mock;
}

// ---------------------------------------------------------------------------
// Contrato de rutas
// ---------------------------------------------------------------------------

test('ruta cotizar: auth:false + policy is-authenticated-auth0', () => {
  assert.equal(rutasCotizar.routes.length, 1);
  const ruta = rutasCotizar.routes[0];
  assert.equal(ruta.method, 'POST');
  assert.equal(ruta.path, '/food-shipping/cotizar');
  assert.equal(ruta.handler, 'food-shipping.cotizar');
  assert.equal(ruta.config.auth, false);
  assert.deepEqual(ruta.config.policies, ['global::is-authenticated-auth0']);
});

test('CRUD core de food-shipping-quote cerrado por completo', () => {
  const fuente = fs.readFileSync(
    path.resolve(__dirname, '../src/api/food-shipping/routes/food-shipping-quote.js'),
    'utf8'
  );
  assert.ok(fuente.includes("except: ['find', 'findOne', 'create', 'update', 'delete']"));
  const schema = JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, '../src/api/food-shipping/content-types/food-shipping-quote/schema.json'),
      'utf8'
    )
  );
  assert.equal(schema.info.singularName, 'food-shipping-quote');
  assert.equal(schema.options.draftAndPublish, false);
  assert.deepEqual(schema.attributes.estado.enum, ['activa', 'consumida', 'expirada', 'invalidada']);
  assert.deepEqual(schema.attributes.provider.enum, ['ciudadan', 'uber_direct']);
  assert.equal(schema.attributes.referencia_proveedor.private, true, 'quote_id de Uber jamás público');
});

// ---------------------------------------------------------------------------
// Tablero normalizado
// ---------------------------------------------------------------------------

test('cotizar: ambos proveedores disponibles, persiste y normaliza', async (t) => {
  const mock = montarCotizar();
  const restaurar = parcharFetchOsrm(5000);
  t.after(restaurar);

  const resultado = await cotizacionService.cotizar({
    usuario: COMPRADOR,
    foodCartId: 12,
    direccionDestinoId: 88,
  });

  assert.equal(resultado.success, true);
  assert.equal(resultado.puedeContinuar, true);
  assert.equal(resultado.direccionDestinoId, 88);
  assert.equal(resultado.restaurantes.length, 1);

  const bloque = resultado.restaurantes[0];
  assert.equal(bloque.restaurantId, 3);
  assert.equal(bloque.nombre, 'Tacos El Buda');

  // Ciudadan: 5 km por calles -> max(30, 20 + 25) = 45 MXN
  const ciudadan = bloque.cotizaciones.ciudadan;
  assert.equal(ciudadan.disponible, true);
  assert.equal(ciudadan.proveedor, 'ciudadan');
  assert.equal(ciudadan.importe, 45);
  assert.equal(ciudadan.moneda, 'MXN');
  assert.equal(ciudadan.distanciaMetros, 5000);
  assert.equal(ciudadan.simulado, false);
  assert.match(ciudadan.cotizacionId, /^fshq_[0-9a-f]{32}$/);
  assert.ok(new Date(ciudadan.vence).getTime() > Date.now());

  // Uber: importe del proveedor ya normalizado, moneda mayúsculas
  const uber = bloque.cotizaciones.uber_direct;
  assert.equal(uber.disponible, true);
  assert.equal(uber.importe, 75);
  assert.equal(uber.moneda, 'MXN');
  assert.equal(uber.distanciaMetros, null);
  assert.ok(uber.cotizacionId.startsWith('fshq_'));

  // Persistencia: dos cotizaciones activas
  const cotizaciones = mock.tablas[UIDS.COTIZACION];
  assert.equal(cotizaciones.length, 2);
  for (const fila of cotizaciones) {
    assert.equal(fila.estado, 'activa');
    assert.equal(fila.user, 7);
    assert.equal(fila.restaurant, 3);
    assert.equal(fila.food_cart, 12);
    assert.equal(fila.direccion_destino, 88);
    assert.equal(fila.direccion_origen, 50);
  }

  const filaCiudadan = cotizaciones.find((f) => f.provider === 'ciudadan');
  assert.equal(filaCiudadan.importe, 45);
  assert.equal(filaCiudadan.distancia_metros, 5000);
  assert.equal(filaCiudadan.referencia_proveedor, null);

  const filaUber = cotizaciones.find((f) => f.provider === 'uber_direct');
  assert.equal(filaUber.referencia_proveedor, 'ubq_secret_1', 'quote_id se persiste privado');

  // NADA de datos internos en la respuesta (quote_id de Uber, usuarios)
  const serializado = JSON.stringify(resultado);
  assert.ok(!serializado.includes('ubq_secret_1'), 'la respuesta no expone el quote_id de Uber');
  assert.ok(!serializado.includes('repartidor@ciudadan.org'));
});

test('cotizar: Uber falla (5xx) y Ciudadan sigue disponible', async (t) => {
  montarCotizar({
    uber: async () => {
      const error = new Error('Uber Direct rechazó la cotización');
      error.status = 500;
      throw error;
    },
  });
  const restaurar = parcharFetchOsrm(3000);
  t.after(restaurar);

  const resultado = await cotizacionService.cotizar({
    usuario: COMPRADOR,
    foodCartId: 12,
    direccionDestinoId: 88,
  });

  assert.equal(resultado.puedeContinuar, true);
  assert.equal(resultado.restaurantes[0].cotizaciones.uber_direct.disponible, false);
  assert.equal(
    resultado.restaurantes[0].cotizaciones.uber_direct.codigoIndisponibilidad,
    'PROVEEDOR_ERROR'
  );
  assert.equal(resultado.restaurantes[0].cotizaciones.ciudadan.disponible, true);
  assert.equal(resultado.restaurantes[0].cotizaciones.ciudadan.importe, 35); // 3 km
});

test('cotizar: Uber timeout -> PROVEEDOR_TIMEOUT sin colgar el checkout', async (t) => {
  montarCotizar({
    uber: () => new Promise(() => {}), // nunca responde
  });
  const restaurar = parcharFetchOsrm(3000);
  t.after(restaurar);

  const inicio = Date.now();
  const resultado = await cotizacionService.cotizar({
    usuario: COMPRADOR,
    foodCartId: 12,
    direccionDestinoId: 88,
  });
  assert.ok(Date.now() - inicio < 2000, 'el timeout de Uber no debe colgar la operación');

  const uber = resultado.restaurantes[0].cotizaciones.uber_direct;
  assert.equal(uber.disponible, false);
  assert.equal(uber.codigoIndisponibilidad, 'PROVEEDOR_TIMEOUT');
  assert.equal(resultado.puedeContinuar, true);
});

test('cotizar: Uber rechazo 4xx -> PROVEEDOR_RECHAZO', async (t) => {
  montarCotizar({
    uber: async () => {
      const error = new Error('no coverage');
      error.status = 422;
      throw error;
    },
  });
  const restaurar = parcharFetchOsrm(3000);
  t.after(restaurar);

  const resultado = await cotizacionService.cotizar({
    usuario: COMPRADOR,
    foodCartId: 12,
    direccionDestinoId: 88,
  });
  assert.equal(
    resultado.restaurantes[0].cotizaciones.uber_direct.codigoIndisponibilidad,
    'PROVEEDOR_RECHAZO'
  );
});

test('cotizar: Uber sin configurar -> PROVEEDOR_NO_CONFIGURADO', async (t) => {
  montarCotizar({
    uber: async () => {
      throw new Error('Falta UBER_DIRECT_CUSTOMER_ID');
    },
  });
  const restaurar = parcharFetchOsrm(3000);
  t.after(restaurar);

  const resultado = await cotizacionService.cotizar({
    usuario: COMPRADOR,
    foodCartId: 12,
    direccionDestinoId: 88,
  });
  assert.equal(
    resultado.restaurantes[0].cotizaciones.uber_direct.codigoIndisponibilidad,
    'PROVEEDOR_NO_CONFIGURADO'
  );
});

test('cotizar: Uber en modo mock se marca simulado (nunca como precio real)', async (t) => {
  montarCotizar({ uber: async () => uberQuoteCotizada({ fee: 65, mock: true, id: 'mockq' }) });
  const restaurar = parcharFetchOsrm(3000);
  t.after(restaurar);

  const resultado = await cotizacionService.cotizar({
    usuario: COMPRADOR,
    foodCartId: 12,
    direccionDestinoId: 88,
  });
  assert.equal(resultado.restaurantes[0].cotizaciones.uber_direct.simulado, true);
});

test('cotizar: fuera de cobertura (12 km por calles) excluye solo a Ciudadan', async (t) => {
  montarCotizar();
  const restaurar = parcharFetchOsrm(12000);
  t.after(restaurar);

  const resultado = await cotizacionService.cotizar({
    usuario: COMPRADOR,
    foodCartId: 12,
    direccionDestinoId: 88,
  });

  const ciudadan = resultado.restaurantes[0].cotizaciones.ciudadan;
  assert.equal(ciudadan.disponible, false);
  assert.equal(ciudadan.codigoIndisponibilidad, 'FUERA_DE_COBERTURA');
  assert.equal(ciudadan.importe, null);

  assert.equal(resultado.restaurantes[0].cotizaciones.uber_direct.disponible, true);
  assert.equal(resultado.puedeContinuar, true);
});

test('cotizar: sin repartidores elegibles -> SIN_REPARTIDORES solo para Ciudadan', async (t) => {
  const mock = montarCotizar({ tablasExtra: { [UIDS.DELIVERY_PROFILE]: [] } });
  void mock;
  const restaurar = parcharFetchOsrm(3000);
  t.after(restaurar);

  const resultado = await cotizacionService.cotizar({
    usuario: COMPRADOR,
    foodCartId: 12,
    direccionDestinoId: 88,
  });

  const ciudadan = resultado.restaurantes[0].cotizaciones.ciudadan;
  assert.equal(ciudadan.disponible, false);
  assert.equal(ciudadan.codigoIndisponibilidad, 'SIN_REPARTIDORES');
  assert.equal(resultado.puedeContinuar, true); // Uber sigue
});

test('cotizar: ruta inexistente -> RUTA_NO_DISPONIBLE sin inventar distancia', async (t) => {
  montarCotizar();
  const restaurar = parcharFetchOsrm(0);
  global.fetch = async () => ({ ok: true, json: async () => ({ code: 'NoRoute', routes: [] }) });
  t.after(restaurar);

  const resultado = await cotizacionService.cotizar({
    usuario: COMPRADOR,
    foodCartId: 12,
    direccionDestinoId: 88,
  });

  const ciudadan = resultado.restaurantes[0].cotizaciones.ciudadan;
  assert.equal(ciudadan.disponible, false);
  assert.equal(ciudadan.codigoIndisponibilidad, 'RUTA_NO_DISPONIBLE');
  assert.equal(ciudadan.importe, null);
});

test('cotizar: NINGÚN proveedor disponible -> puedeContinuar false', async (t) => {
  montarCotizar({
    uber: async () => {
      const error = new Error('nope');
      error.status = 500;
      throw error;
    },
  });
  const restaurar = parcharFetchOsrm(12000);
  t.after(restaurar);

  const resultado = await cotizacionService.cotizar({
    usuario: COMPRADOR,
    foodCartId: 12,
    direccionDestinoId: 88,
  });
  assert.equal(resultado.puedeContinuar, false);
  assert.equal(resultado.restaurantes[0].cotizaciones.ciudadan.disponible, false);
  assert.equal(resultado.restaurantes[0].cotizaciones.uber_direct.disponible, false);
});

test('cotizar: re-cotizar invalida las cotizaciones activas previas', async (t) => {
  const mock = montarCotizar();
  const restaurar = parcharFetchOsrm(5000);
  t.after(restaurar);

  await cotizacionService.cotizar({ usuario: COMPRADOR, foodCartId: 12, direccionDestinoId: 88 });
  const primeras = mock.tablas[UIDS.COTIZACION].map((f) => f.codigo);
  assert.equal(primeras.length, 2);

  await cotizacionService.cotizar({ usuario: COMPRADOR, foodCartId: 12, direccionDestinoId: 88 });

  const filas = mock.tablas[UIDS.COTIZACION];
  assert.equal(filas.length, 4);
  const porCodigo = new Map(filas.map((f) => [f.codigo, f]));
  for (const codigo of primeras) {
    assert.equal(porCodigo.get(codigo).estado, 'invalidada');
  }
  assert.equal(filas.filter((f) => f.estado === 'activa').length, 2);
});

test('cotizar por pedido en preparación (foodOrderId)', async (t) => {
  montarCotizar();
  const restaurar = parcharFetchOsrm(5000);
  t.after(restaurar);

  const resultado = await cotizacionService.cotizar({
    usuario: COMPRADOR,
    foodOrderId: 55,
    direccionDestinoId: 88,
  });
  assert.equal(resultado.puedeContinuar, true);
  assert.equal(resultado.restaurantes[0].restaurantId, 3);
  assert.equal(resultado.restaurantes[0].cotizaciones.ciudadan.importe, 45);
});

// ---------------------------------------------------------------------------
// Seguridad: identidad, propiedad y validación de entradas
// ---------------------------------------------------------------------------

test('cotizar: carrito ajeno responde 404 (no filtra su existencia)', async () => {
  montarCotizar();
  await assert.rejects(
    () => cotizacionService.cotizar({ usuario: COMPRADOR, foodCartId: 13, direccionDestinoId: 88 }),
    (e) => e.status === 404
  );
});

test('cotizar: dirección de entrega ajena responde 404', async () => {
  montarCotizar();
  await assert.rejects(
    () =>
      cotizacionService.cotizar({ usuario: COMPRADOR, foodCartId: 12, direccionDestinoId: 89 }),
    (e) => e.status === 404
  );
});

test('cotizar: sin carrito ni pedido -> 400', async () => {
  montarCotizar();
  await assert.rejects(
    () => cotizacionService.cotizar({ usuario: COMPRADOR, direccionDestinoId: 88 }),
    (e) => e.status === 400
  );
});

test('cotizar: carrito y pedido a la vez -> 400', async () => {
  montarCotizar();
  await assert.rejects(
    () =>
      cotizacionService.cotizar({
        usuario: COMPRADOR,
        foodCartId: 12,
        foodOrderId: 55,
        direccionDestinoId: 88,
      }),
    (e) => e.status === 400
  );
});

test('cotizar: destino inline plano {lat,lng} sin dirección guardada', async (t) => {
  const mock = montarCotizar();
  const restaurar = parcharFetchOsrm(5000);
  t.after(restaurar);

  const resultado = await cotizacionService.cotizar({
    usuario: COMPRADOR,
    foodCartId: 12,
    direccionDestino: { lat: 19.45, lng: -99.15 },
  });

  assert.equal(resultado.direccionDestinoId, null);
  assert.equal(resultado.puedeContinuar, true);
  const filaCiudadan = mock.tablas[UIDS.COTIZACION].find((f) => f.provider === 'ciudadan');
  assert.deepEqual(filaCiudadan.destino_coords, { lat: 19.45, lng: -99.15 });
  assert.ok(filaCiudadan.destino_inline, 'se guarda el snapshot del destino inline');
  assert.equal(filaCiudadan.direccion_destino, null);
});

test('cotizar: destino inline llega al service de Uber en formato fila de direccion', async (t) => {
  let recibido = null;
  montarCotizar({
    uber: async (params) => {
      recibido = params;
      return uberQuoteCotizada();
    },
  });
  const restaurar = parcharFetchOsrm(5000);
  t.after(restaurar);

  await cotizacionService.cotizar({
    usuario: COMPRADOR,
    foodCartId: 12,
    direccionDestino: { lat: 19.45, lng: -99.15 },
  });

  assert.equal(recibido.direccionDestinoId, null);
  assert.ok(recibido.direccionDestino?.coords, 'coords en formato fila');
  assert.equal(recibido.direccionDestino.coords.lat, 19.45);
  assert.equal(recibido.direccionDestino.direccion.lat, 19.45);
  assert.equal(recibido.restaurantId, 3);
});

test('cotizar: restaurante sin coordenadas -> ORIGEN_SIN_COORDENADAS en ambos proveedores de tarifa propia', async (t) => {
  montarCotizar({
    tablasExtra: {
      [UIDS.DIRECCION]: [
        { id: 50, restaurant_id: 3, activa: true, coords: null, direccion: null },
        {
          id: 88,
          user_email: 'comprador@ciudadan.org',
          coords: JSON.stringify(DESTINO_COORDS),
        },
      ],
    },
  });

  await assert.rejects(
    () => cotizacionService.cotizar({ usuario: COMPRADOR, foodCartId: 12, direccionDestinoId: 88 }),
    (e) => e.status === 400 && /coordenadas/.test(e.message)
  );
});

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

function crearCtxCotizaciones({ strapiUser, body }) {
  const ctx = crearCtxRepartidores({ strapiUser, body });
  ctx.send = (bodyRespuesta) => {
    ctx.body = bodyRespuesta;
    return bodyRespuesta;
  };
  ctx.unauthorized = (mensaje) => {
    const e = new Error(mensaje);
    e.status = 401;
    e.expose = true;
    throw e;
  };
  ctx.internalServerError = (mensaje) => {
    const e = new Error(mensaje);
    e.status = 500;
    e.expose = true;
    throw e;
  };
  return ctx;
}

test('controller: sin sesión responde 401', async () => {
  montarCotizar();
  const ctx = crearCtxCotizaciones({ strapiUser: null, body: { foodCartId: 12 } });
  await assert.rejects(() => controller.cotizar(ctx), (e) => e.status === 401);
});

test('controller: sesión válida devuelve el tablero con ctx.send', async (t) => {
  montarCotizar();
  const restaurar = parcharFetchOsrm(5000);
  t.after(restaurar);

  const ctx = crearCtxCotizaciones({
    strapiUser: COMPRADOR,
    body: { foodCartId: 12, direccionDestinoId: 88 },
  });
  await controller.cotizar(ctx);

  assert.equal(ctx.body.success, true);
  assert.equal(ctx.body.puedeContinuar, true);
  assert.ok(ctx.body.restaurantes[0].cotizaciones.ciudadan.cotizacionId);
});

test('controller: error de validación se mapea a 404 sin filtrar detalles', async () => {
  montarCotizar();
  const ctx = crearCtxCotizaciones({
    strapiUser: COMPRADOR,
    body: { foodCartId: 13, direccionDestinoId: 88 }, // carrito ajeno
  });
  await assert.rejects(
    () => controller.cotizar(ctx),
    (e) => e.status === 404 && e.message === 'El carrito no existe'
  );
});

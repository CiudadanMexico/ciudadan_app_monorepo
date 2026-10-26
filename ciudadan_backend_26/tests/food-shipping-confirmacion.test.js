'use strict';

/**
 * Confirmación de compra con cotización (lifecycle de food-order + rama
 * ciudadan de verify-payment):
 * - revalidación server-side (propiedad, vigencia, restaurante, destino,
 *   huella del carrito, disponibilidad);
 * - consumo único atómico (bloqueo optimista) y anti doble confirmación;
 * - importes autoritativos: el cliente no puede alterar envío ni total;
 * - flujo legacy (metadata.uber_direct) intacto: cero regresión.
 */

process.env.COTIZACION_VIGENCIA_MIN = '15';
process.env.REPARTIDOR_UBICACION_MAX_MIN = '15';
process.env.UBER_DIRECT_MOCK = 'true';

const fs = require('fs');
const path = require('path');
const Module = require('module');
const test = require('node:test');
const assert = require('node:assert/strict');

const { crearStrapiRepartidoresMock } = require('./helpers/strapi-mock-repartidores');
const { UIDS } = require('../src/api/food-shipping/utils/constants');
const cotizacionService = require('../src/api/food-shipping/services/cotizacion-service');
const lifecycles = require('../src/api/food-order/content-types/food-order/lifecycles');

const COMPRADOR_ID = 7;
const RESTAURANTE_ID = 3;
const FUTURO = () => new Date(Date.now() + 10 * 60 * 1000).toISOString();
const PASADO = () => new Date(Date.now() - 10 * 60 * 1000).toISOString();

const ITEMS_CARRITO = [{ product: { id: 101 }, variant: null, cantidad: 2, subtotal: 200 }];
const HUELLA = cotizacionService.huellaDeItems(ITEMS_CARRITO);

function cotizacionBase(extra = {}) {
  return {
    id: 1,
    codigo: 'fshq_' + 'a'.repeat(32),
    user: COMPRADOR_ID,
    restaurant: RESTAURANTE_ID,
    food_cart: 12,
    food_order: null,
    direccion_origen: 50,
    direccion_destino: 88,
    origen_coords: { lat: 19.4326, lng: -99.1332 },
    destino_coords: { lat: 19.45, lng: -99.15 },
    provider: 'ciudadan',
    importe: 45,
    moneda: 'MXN',
    distancia_metros: 5000,
    estado: 'activa',
    vencimiento: FUTURO(),
    referencia_proveedor: null,
    huella_carrito: HUELLA,
    metadata: {},
    ...extra,
  };
}

function ordenBase(extra = {}) {
  return {
    user: COMPRADOR_ID,
    restaurant: RESTAURANTE_ID,
    direccion_destino: 88,
    items: ITEMS_CARRITO,
    metadata: { cotizacion_envio: { codigo: cotizacionBase().codigo } },
    monto_envio: 1,
    monto_total: 999,
    moneda: 'MXN',
    ...extra,
  };
}

function montarConfirmacion({ cotizaciones = [], perfiles = null, entregas = [] } = {}) {
  return crearStrapiRepartidoresMock({
    tablas: {
      [UIDS.COTIZACION]: cotizaciones,
      [UIDS.DIRECCION]: [
        {
          id: 88,
          user_email: 'comprador@ciudadan.org',
          coords: JSON.stringify({ lat: 19.45, lng: -99.15 }),
          direccion: JSON.stringify({ street: 'Calle del cliente' }),
        },
        {
          id: 90,
          user_email: 'comprador@ciudadan.org',
          coords: JSON.stringify({ lat: 19.9, lng: -99.9 }), // coords distintas
          direccion: JSON.stringify({ street: 'Lejos' }),
        },
      ],
      [UIDS.DELIVERY_PROFILE]:
        perfiles === null
          ? [
              {
                id: 1,
                status: 'approved',
                user: { id: 20, roles: { extra: ['repartidor'] } },
                vehicles: [{ type: 'bicicleta', validation_status: 'verificado' }],
              },
            ]
          : perfiles,
      [UIDS.DRIVER_LOCATION]: [
        {
          id: 1,
          driver_id: 20,
          coords: JSON.stringify({ lat: 19.433, lng: -99.134 }),
          time: new Date().toISOString(),
        },
      ],
      [UIDS.FOOD_DELIVERY]: entregas,
    },
  });
}

function eventoBeforeCreate(data) {
  return { params: { data } };
}

// ---------------------------------------------------------------------------
// Revalidación y consumo en beforeCreate
// ---------------------------------------------------------------------------

test('confirmación válida: consume la cotización y fija importes server-side', async () => {
  const mock = montarConfirmacion({ cotizaciones: [cotizacionBase()] });
  const datos = ordenBase({ monto_envio: 1, monto_total: 999 }); // cliente intentó alterar

  await lifecycles.beforeCreate(eventoBeforeCreate(datos));

  // Importe autoritativo de la cotización; total recalculado en servidor.
  assert.equal(datos.monto_envio, 45);
  assert.equal(datos.monto_total, 245); // 200 de items + 45 de envío
  assert.equal(datos.metadata.cotizacion_envio_confirmada.proveedor, 'ciudadan');
  assert.equal(datos.metadata.cotizacion_envio_confirmada.importe, 45);
  assert.equal(mock.tablas[UIDS.COTIZACION][0].estado, 'consumida');
});

test('sin cotizacion_envio en el payload: flujo legacy intacto (no-op)', async () => {
  montarConfirmacion({ cotizaciones: [cotizacionBase()] });
  const datos = ordenBase({ metadata: { uber_direct: { quote_id: 'legacy' } } });

  await lifecycles.beforeCreate(eventoBeforeCreate(datos));

  assert.equal(datos.monto_envio, 1, 'legacy: el importe no se toca');
  assert.equal(datos.monto_total, 999);
  assert.ok(!datos.metadata.cotizacion_envio_confirmada);
});

test('cotización inexistente: 400', async () => {
  montarConfirmacion({ cotizaciones: [] });
  await assert.rejects(
    () => lifecycles.beforeCreate(eventoBeforeCreate(ordenBase())),
    (e) => e.status === 400 && /no es válida/.test(e.message)
  );
});

test('cotización ya consumida: 409 (anti doble confirmación)', async () => {
  montarConfirmacion({ cotizaciones: [cotizacionBase({ estado: 'consumida' })] });
  await assert.rejects(
    () => lifecycles.beforeCreate(eventoBeforeCreate(ordenBase())),
    (e) => e.status === 409 && /ya fue utilizada/.test(e.message)
  );
});

test('cotización expirada por vencimiento: 409 y se marca expirada', async () => {
  const mock = montarConfirmacion({ cotizaciones: [cotizacionBase({ vencimiento: PASADO() })] });
  await assert.rejects(
    () => lifecycles.beforeCreate(eventoBeforeCreate(ordenBase())),
    (e) => e.status === 409 && /expiró/.test(e.message)
  );
  assert.equal(mock.tablas[UIDS.COTIZACION][0].estado, 'expirada');
});

test('cotización invalidada por re-cotización: se rechaza (400)', async () => {
  montarConfirmacion({ cotizaciones: [cotizacionBase({ estado: 'invalidada' })] });
  await assert.rejects(
    () => lifecycles.beforeCreate(eventoBeforeCreate(ordenBase())),
    (e) => e.status === 400 && /no es válida/.test(e.message)
  );
});

test('cotización de OTRO usuario: 403 (no se puede usar la cotización ajena)', async () => {
  montarConfirmacion({ cotizaciones: [cotizacionBase({ user: 99 })] });
  await assert.rejects(
    () => lifecycles.beforeCreate(eventoBeforeCreate(ordenBase())),
    (e) => e.status === 403 && /otro usuario/.test(e.message)
  );
});

test('restaurante de la orden no coincide con la cotización: 400', async () => {
  montarConfirmacion({ cotizaciones: [cotizacionBase({ restaurant: 8 })] });
  await assert.rejects(
    () => lifecycles.beforeCreate(eventoBeforeCreate(ordenBase())),
    (e) => e.status === 400 && /restaurante/.test(e.message)
  );
});

test('dirección de entrega cambiada (id distinto): 409 DESTINO_MODIFICADO', async () => {
  montarConfirmacion({ cotizaciones: [cotizacionBase()] });
  await assert.rejects(
    () => lifecycles.beforeCreate(eventoBeforeCreate(ordenBase({ direccion_destino: 90 }))),
    (e) => e.status === 409 && /dirección de entrega cambió/.test(e.message)
  );
});

test('destino inline: coords equivalentes (≤11 m) pasan; distintas no', async () => {
  montarConfirmacion({
    cotizaciones: [
      cotizacionBase({
        direccion_destino: null,
        destino_coords: { lat: 19.45, lng: -99.15 },
      }),
    ],
  });
  const datos = ordenBase();
  await lifecycles.beforeCreate(eventoBeforeCreate(datos));
  assert.equal(datos.monto_envio, 45);

  // Coords que difieren más que la tolerancia -> rechazo.
  montarConfirmacion({
    cotizaciones: [
      cotizacionBase({ id: 2, direccion_destino: null, destino_coords: { lat: 19.9, lng: -99.9 } }),
    ],
  });
  const datos2 = ordenBase();
  await assert.rejects(
    () => lifecycles.beforeCreate(eventoBeforeCreate(datos2)),
    (e) => e.status === 409
  );
});

test('carrito modificado (producto/cantidad) invalida la cotización: 409', async () => {
  montarConfirmacion({ cotizaciones: [cotizacionBase()] });
  const itemsModificados = [{ product: { id: 101 }, variant: null, cantidad: 5, subtotal: 500 }];
  await assert.rejects(
    () =>
      lifecycles.beforeCreate(
        eventoBeforeCreate(ordenBase({ items: itemsModificados, metadata: ordenBase().metadata }))
      ),
    (e) => e.status === 409 && /carrito cambió/.test(e.message)
  );
});

test('ciudadan sin repartidores al confirmar: 409 SIN_REPARTIDORES', async () => {
  montarConfirmacion({ cotizaciones: [cotizacionBase()], perfiles: [] });
  await assert.rejects(
    () => lifecycles.beforeCreate(eventoBeforeCreate(ordenBase())),
    (e) => e.status === 409 && /repartidores/.test(e.message)
  );
});

test('uber_direct al confirmar no exige repartidores', async () => {
  montarConfirmacion({
    cotizaciones: [cotizacionBase({ provider: 'uber_direct', referencia_proveedor: 'ubq_1' })],
    perfiles: [],
  });
  const datos = ordenBase();
  await lifecycles.beforeCreate(eventoBeforeCreate(datos));
  assert.equal(datos.monto_envio, 45);
});

test('consumo atómico: la segunda confirmación concurrente pierde (update condicional)', async () => {
  const mock = montarConfirmacion({ cotizaciones: [cotizacionBase()] });
  const fila = mock.tablas[UIDS.COTIZACION][0];

  const primera = await global.strapi.db.query(UIDS.COTIZACION).update({
    where: { id: fila.id, estado: 'activa' },
    data: { estado: 'consumida' },
  });
  assert.ok(primera, 'la primera escritura gana');

  const segunda = await global.strapi.db.query(UIDS.COTIZACION).update({
    where: { id: fila.id, estado: 'activa' },
    data: { estado: 'consumida' },
  });
  assert.equal(segunda, null, 'la segunda escritura condicional devuelve null');
});

test('confirmaciones repetidas con la misma cotización: solo una gana', async () => {
  montarConfirmacion({ cotizaciones: [cotizacionBase()] });

  await lifecycles.beforeCreate(eventoBeforeCreate(ordenBase()));
  await assert.rejects(
    () => lifecycles.beforeCreate(eventoBeforeCreate(ordenBase())),
    (e) => e.status === 409 && /ya fue utilizada/.test(e.message)
  );
});

test('afterCreate enlaza la cotización consumida con la orden (best-effort)', async () => {
  const mock = montarConfirmacion({ cotizaciones: [cotizacionBase()] });
  await lifecycles.beforeCreate(eventoBeforeCreate(ordenBase()));

  await lifecycles.afterCreate({
    result: { id: 900, metadata: { cotizacion_envio: { codigo: cotizacionBase().codigo } } },
  });

  assert.equal(mock.tablas[UIDS.COTIZACION][0].food_order, 900);
});

// ---------------------------------------------------------------------------
// verify-payment: rama ciudadan y regresión del flujo uber legacy
// ---------------------------------------------------------------------------

function loadFoodOrderService(strapi) {
  const file = path.resolve(__dirname, '../src/api/food-order/services/food-order.js');
  const src = fs.readFileSync(file, 'utf8');
  const m = new Module(file, null);
  m.filename = file;
  m.paths = Module._nodeModulePaths(path.dirname(file));
  const fakeStrapiModule = {
    factories: {
      createCoreService: (uid, fn) => (typeof fn === 'function' ? fn({ strapi }) : {}),
    },
  };
  const fakeRequire = (id) => (id === '@strapi/strapi' ? fakeStrapiModule : m.require(id));
  const run = new Function('require', 'module', 'exports', src);
  run(fakeRequire, m, m.exports);
  return m.exports;
}

function montarVerifyPayment({ order, foodDeliveries = [], createFromCiudadan, createFromUber }) {
  const actualizaciones = [];
  const mock = crearStrapiRepartidoresMock({
    tablas: {
      [UIDS.FOOD_ORDER]: [order],
    },
    servicios: {
      'api::food-delivery.food-delivery': {
        findByFoodOrder: async () => foodDeliveries[0] || null,
        createFromCiudadan,
        createFromUber,
      },
    },
  });

  mock.strapi.entityService.findMany = async (uid, params = {}) => {
    if (uid === 'api::food-delivery.food-delivery') return foodDeliveries;
    if (uid === 'api::direccion.direccion') {
      return [
        {
          id: 50,
          direccion: JSON.stringify({ street: 'Calle del restaurante', lat: 19.4326, lng: -99.1332 }),
          coords: JSON.stringify({ lat: 19.4326, lng: -99.1332 }),
        },
      ];
    }
    return [];
  };

  mock.strapi.entityService.update = async (uid, id, { data }) => {
    actualizaciones.push({ uid, id, data });
    const fila = mock.tablas[UIDS.FOOD_ORDER].find((f) => Number(f.id) === Number(id));
    if (fila) Object.assign(fila, data);
    return { ...fila, ...data };
  };

  global.strapi = mock.strapi;
  return { mock, actualizaciones };
}

test('verify-payment ciudadan: registra entrega pendiente SIN llamar a Uber', async () => {
  const orden = {
    id: 55,
    status: 'pendiente_verificacion',
    user: { id: 7 },
    restaurant: { id: 3 },
    direccion_destino: {
      direccion: JSON.stringify({ street: 'Calle del cliente', lat: 19.45, lng: -99.15 }),
      coords: JSON.stringify({ lat: 19.45, lng: -99.15 }),
    },
    pago: { id: 800, comprobante: { id: 900 } },
    items: [{ nombre: 'Taco', precio_unitario: 50, cantidad: 2 }],
    metadata: {
      cotizacion_envio_confirmada: { cotizacionId: 'fshq_zzz', proveedor: 'ciudadan', importe: 45, moneda: 'MXN' },
    },
    monto_envio: 45,
    moneda: 'MXN',
    delivery_contact_name: 'Ana',
    delivery_contact_phone: '55',
    delivery_notes: '',
    fecha_verificado: null,
  };

  const creadas = [];
  const { actualizaciones } = montarVerifyPayment({
    order: orden,
    createFromCiudadan: async (args) => {
      creadas.push(args);
      return { id: 77 };
    },
    createFromUber: async () => {
      throw new Error('createFromUber NO debe llamarse en la rama ciudadan');
    },
  });

  const service = loadFoodOrderService(global.strapi);
  const resultado = await service.verifyPaymentAndCreateDelivery(55, null, {
    pickupName: 'Restaurante',
    pickupPhone: '55',
  });

  assert.equal(resultado.alreadyProcessed, false);
  assert.equal(creadas.length, 1);
  assert.equal(creadas[0].provider, undefined); // el provider lo fija createFromCiudadan
  assert.equal(creadas[0].quoteId, 'fshq_zzz');
  assert.equal(creadas[0].fee, 45);
  assert.equal(creadas[0].foodOrderId, 55);
  assert.equal(creadas[0].userId, 7);

  const actualizacion = actualizaciones.find((a) => a.uid === 'api::food-order.food-order');
  assert.equal(actualizacion.data.status, 'pendiente_envio');
  assert.equal(actualizacion.data.metadata.delivery_provider, 'ciudadan');
  assert.equal(actualizacion.data.metadata.delivery_mock, false);
  assert.equal(actualizacion.data.metadata.food_delivery_id, 77);
});

test('verify-payment legacy uber: el flujo con metadata.uber_direct sigue igual', async () => {
  const orden = {
    id: 56,
    status: 'pendiente_verificacion',
    user: { id: 7 },
    restaurant: { id: 3 },
    direccion_destino: {
      direccion: JSON.stringify({ street: 'Calle del cliente', lat: 19.45, lng: -99.15 }),
      coords: JSON.stringify({ lat: 19.45, lng: -99.15 }),
    },
    pago: { id: 801, comprobante: { id: 901 } },
    items: [{ nombre: 'Taco', precio_unitario: 50, cantidad: 1 }],
    metadata: {
      uber_direct: { quote_id: 'ubq_legacy', fee: 75, currency: 'MXN' },
    },
    monto_envio: 75,
    moneda: 'MXN',
    delivery_contact_name: 'Ana',
    delivery_contact_phone: '55',
    delivery_notes: '',
    fecha_verificado: null,
  };

  const creadas = [];
  const { actualizaciones } = montarVerifyPayment({
    order: orden,
    createFromUber: async (args) => {
      creadas.push(args);
      return { id: 66 };
    },
    createFromCiudadan: async () => {
      throw new Error('createFromCiudadan NO debe llamarse en el flujo legacy');
    },
  });

  const service = loadFoodOrderService(global.strapi);
  const resultado = await service.verifyPaymentAndCreateDelivery(56, null, {
    pickupName: 'Restaurante',
    pickupPhone: '55',
  });

  assert.equal(resultado.alreadyProcessed, false);
  assert.equal(creadas.length, 1);
  assert.equal(creadas[0].quoteId, 'ubq_legacy');

  const actualizacion = actualizaciones.find((a) => a.uid === 'api::food-order.food-order');
  assert.equal(actualizacion.data.metadata.delivery_provider, 'uber_direct');
  assert.equal(actualizacion.data.metadata.food_delivery_id, 66);
});

test('verify-payment sin proveedor de envío: 400 como antes (regresión de validación)', async () => {
  const orden = {
    id: 57,
    status: 'pendiente_verificacion',
    user: { id: 7 },
    restaurant: { id: 3 },
    direccion_destino: { direccion: JSON.stringify({ lat: 19.45, lng: -99.15 }) },
    pago: { id: 802, comprobante: { id: 902 } },
    items: [],
    metadata: {},
    delivery_contact_name: 'Ana',
    delivery_contact_phone: '55',
    fecha_verificado: null,
  };

  montarVerifyPayment({ order: orden, createFromCiudadan: async () => ({}), createFromUber: async () => ({}) });

  const service = loadFoodOrderService(global.strapi);
  await assert.rejects(
    () =>
      service.verifyPaymentAndCreateDelivery(57, null, { pickupName: 'R', pickupPhone: '55' }),
    (e) => e.status === 400 && /quote_id/.test(e.message)
  );
});

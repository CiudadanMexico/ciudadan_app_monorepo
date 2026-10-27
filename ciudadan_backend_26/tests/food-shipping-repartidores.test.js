'use strict';

/**
 * Repartidores elegibles de Ciudadan (repartidores-service) — MVP Food.
 * Radio de 10 km alrededor del restaurante + reglas de elegibilidad con
 * estructuras existentes: estado approved, rol 'repartidor', vehículo
 * verificado, ubicación reciente, sin entrega activa asignada.
 */

process.env.COTIZACION_VIGENCIA_MIN = '15';
process.env.REPARTIDOR_UBICACION_MAX_MIN = '15';

const test = require('node:test');
const assert = require('node:assert/strict');

const { crearStrapiRepartidoresMock } = require('./helpers/strapi-mock-repartidores');
const { UIDS } = require('../src/api/food-shipping/utils/constants');
const servicio = require('../src/api/food-shipping/services/repartidores-service');

const RESTAURANTE = { lat: 19.4326, lng: -99.1332 }; // Zócalo CDMX
const hace = (minutos) => new Date(Date.now() - minutos * 60 * 1000).toISOString();

function perfilBase(id, userId, extra = {}) {
  return {
    id,
    status: 'approved',
    user: { id: userId, roles: { extra: ['repartidor'] } },
    vehicles: [{ type: 'bicicleta', validation_status: 'verificado' }],
    ...extra,
  };
}

function ubicacion(id, userId, lat, lng, minutos = 2) {
  return {
    id,
    driver_id: userId,
    coords: JSON.stringify({ lat, lng }),
    time: hace(minutos),
  };
}

function montar({ perfiles = [], ubicaciones = [], entregas = [] } = {}) {
  return crearStrapiRepartidoresMock({
    tablas: {
      [UIDS.DELIVERY_PROFILE]: perfiles,
      [UIDS.DRIVER_LOCATION]: ubicaciones,
      [UIDS.FOOD_DELIVERY]: entregas,
    },
  });
}

// A ~0.01° de latitud ≈ 1.1 km del Zócalo.
const CERCA = { lat: 19.4426, lng: -99.1332 };
const LEJOS = { lat: 19.60, lng: -99.1332 }; // ~18.6 km

test('repartidor elegible completo (bicicleta, 1.1 km, ubicación fresca)', async () => {
  montar({
    perfiles: [perfilBase(1, 20)],
    ubicaciones: [ubicacion(1, 20, CERCA.lat, CERCA.lng)],
  });
  const { total, repartidores, descartes } = await servicio.buscarRepartidoresElegibles(RESTAURANTE);
  assert.equal(total, 1);
  assert.equal(repartidores[0].usuarioId, 20);
  assert.deepEqual(repartidores[0].tiposVehiculo, ['bicicleta']);
  assert.equal(descartes.ocupado, 0);
});

test('repartidor fuera del radio de 10 km queda excluido', async () => {
  montar({
    perfiles: [perfilBase(1, 20)],
    ubicaciones: [ubicacion(1, 20, LEJOS.lat, LEJOS.lng)],
  });
  const { total, descartes } = await servicio.buscarRepartidoresElegibles(RESTAURANTE);
  assert.equal(total, 0);
  assert.equal(descartes.fuera_de_radio, 1);
});

test('haversine: ~0.05° de lng en CDMX ≈ 5.2 km (dentro), ~0.25° ≈ 26 km (fuera)', () => {
  const cinco = servicio.haversineKm(19.4326, -99.1332, 19.4326, -99.0832);
  assert.ok(cinco > 4.5 && cinco < 6, `esperado ~5.2 km, salió ${cinco}`);
  const lejos = servicio.haversineKm(19.4326, -99.1332, 19.4326, -98.8832);
  assert.ok(lejos > 10, `esperado >10 km, salió ${lejos}`);
});

test('perfil no aprobado (suspended): ni se evalúa (solo approved)', async () => {
  montar({
    perfiles: [
      { ...perfilBase(1, 20), status: 'suspended' },
      { ...perfilBase(2, 21), status: 'pending_review' },
    ],
    ubicaciones: [ubicacion(1, 20, CERCA.lat, CERCA.lng), ubicacion(2, 21, CERCA.lat, CERCA.lng)],
  });
  const { total } = await servicio.buscarRepartidoresElegibles(RESTAURANTE);
  assert.equal(total, 0);
});

test('aprobado SIN rol repartidor queda descartado (rol y estado van juntos)', async () => {
  montar({
    perfiles: [{ ...perfilBase(1, 20), user: { id: 20, roles: { extra: ['socio'] } } }],
    ubicaciones: [ubicacion(1, 20, CERCA.lat, CERCA.lng)],
  });
  const { total, descartes } = await servicio.buscarRepartidoresElegibles(RESTAURANTE);
  assert.equal(total, 0);
  assert.equal(descartes.sin_rol, 1);
});

test('vehículo no verificado (pendiente) queda descartado', async () => {
  montar({
    perfiles: [
      perfilBase(1, 20, { vehicles: [{ type: 'motocicleta', validation_status: 'pendiente' }] }),
    ],
    ubicaciones: [ubicacion(1, 20, CERCA.lat, CERCA.lng)],
  });
  const { total, descartes } = await servicio.buscarRepartidoresElegibles(RESTAURANTE);
  assert.equal(total, 0);
  assert.equal(descartes.sin_vehiculo_verificado, 1);
});

test('ubicación obsoleta (más de 15 min) queda descartada', async () => {
  montar({
    perfiles: [perfilBase(1, 20)],
    ubicaciones: [ubicacion(1, 20, CERCA.lat, CERCA.lng, 120)], // hace 2 horas
  });
  const { total, descartes } = await servicio.buscarRepartidoresElegibles(RESTAURANTE);
  assert.equal(total, 0);
  assert.equal(descartes.sin_ubicacion_reciente, 1);
});

test('repartidor con entrega activa asignada queda ocupado', async () => {
  montar({
    perfiles: [perfilBase(1, 20)],
    ubicaciones: [ubicacion(1, 20, CERCA.lat, CERCA.lng)],
    entregas: [
      { id: 500, provider: 'ciudadan', status: 'in_transit', repartidor: 20 },
    ],
  });
  const { total, descartes } = await servicio.buscarRepartidoresElegibles(RESTAURANTE);
  assert.equal(total, 0);
  assert.equal(descartes.ocupado, 1);
});

test('entrega FINALIZADA o de otro proveedor NO ocupa al repartidor', async () => {
  montar({
    perfiles: [perfilBase(1, 20), perfilBase(2, 21)],
    ubicaciones: [ubicacion(1, 20, CERCA.lat, CERCA.lng), ubicacion(2, 21, CERCA.lat, CERCA.lng)],
    entregas: [
      { id: 500, provider: 'ciudadan', status: 'delivered', repartidor: 20 },
      { id: 501, provider: 'uber_direct', status: 'pending', repartidor: 21 },
    ],
  });
  const { total, descartes } = await servicio.buscarRepartidoresElegibles(RESTAURANTE);
  assert.equal(total, 2);
  assert.equal(descartes.ocupado, 0);
});

test('los tres tipos de vehículo son elegibles con el mismo límite', async () => {
  montar({
    perfiles: [
      perfilBase(1, 20),
      perfilBase(2, 21, { vehicles: [{ type: 'bicicleta_electrica', validation_status: 'verificado' }] }),
      perfilBase(3, 22, { vehicles: [{ type: 'motocicleta', validation_status: 'verificado' }] }),
    ],
    ubicaciones: [
      ubicacion(1, 20, CERCA.lat, CERCA.lng),
      ubicacion(2, 21, CERCA.lat, CERCA.lng),
      ubicacion(3, 22, CERCA.lat, CERCA.lng),
    ],
  });
  const { total, repartidores } = await servicio.buscarRepartidoresElegibles(RESTAURANTE);
  assert.equal(total, 3);
  const tipos = repartidores.map((r) => r.tiposVehiculo[0]).sort();
  assert.deepEqual(tipos, ['bicicleta', 'bicicleta_electrica', 'motocicleta']);
});

test('se usa SOLO la última ubicación del repartidor (la más reciente)', async () => {
  montar({
    perfiles: [perfilBase(1, 20)],
    ubicaciones: [
      // Primera lectura cerca (hace 10 min), última lectura lejos (hace 2 min).
      ubicacion(1, 20, CERCA.lat, CERCA.lng, 10),
      ubicacion(2, 20, LEJOS.lat, LEJOS.lng, 2),
    ],
  });
  const { total, descartes } = await servicio.buscarRepartidoresElegibles(RESTAURANTE);
  assert.equal(total, 0);
  assert.equal(descartes.fuera_de_radio, 1);
});

test('se usa la última ubicación cuando la última es la que está cerca', async () => {
  montar({
    perfiles: [perfilBase(1, 20)],
    ubicaciones: [
      ubicacion(1, 20, LEJOS.lat, LEJOS.lng, 10),
      ubicacion(2, 20, CERCA.lat, CERCA.lng, 2),
    ],
  });
  const { total } = await servicio.buscarRepartidoresElegibles(RESTAURANTE);
  assert.equal(total, 1);
});

test('coords como objeto JSON (driver de MySQL) se parsean igual', async () => {
  montar({
    perfiles: [perfilBase(1, 20)],
    ubicaciones: [
      { id: 1, driver_id: 20, coords: { lat: CERCA.lat, lng: CERCA.lng }, time: hace(1) },
    ],
  });
  const { total } = await servicio.buscarRepartidoresElegibles(RESTAURANTE);
  assert.equal(total, 1);
});

test('orden por distancia ascendente', async () => {
  montar({
    perfiles: [perfilBase(1, 20), perfilBase(2, 21)],
    ubicaciones: [
      ubicacion(1, 20, 19.4376, -99.1332), // ~0.55 km
      ubicacion(2, 21, 19.4526, -99.1332), // ~2.2 km
    ],
  });
  const { repartidores } = await servicio.buscarRepartidoresElegibles(RESTAURANTE);
  assert.ok(repartidores[0].distanciaKm <= repartidores[1].distanciaKm);
});

test('repartidor exactamente en el límite (10 km) sigue elegible', async () => {
  montar({
    perfiles: [perfilBase(1, 20)],
    // 10 km al sur: 10/111.32 ≈ 0.0898° de latitud
    ubicaciones: [ubicacion(1, 20, RESTAURANTE.lat - 10 / 111.32, RESTAURANTE.lng)],
  });
  const { total, descartes } = await servicio.buscarRepartidoresElegibles(RESTAURANTE);
  assert.equal(descartes.fuera_de_radio, 0);
  assert.equal(total, 1);
});

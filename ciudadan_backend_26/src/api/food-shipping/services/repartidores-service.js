'use strict';

/**
 * Búsqueda de repartidores elegibles para entregas Food de Ciudadan.
 *
 * Solo usa estructuras y estados EXISTENTES (spec §1.2): no inventa estados de
 * aprobación ni concede roles.
 *
 * Elegibilidad (todas a la vez):
 *  1. delivery-profile.status === 'approved' (aprobado para operar;
 *     'suspended' queda excluido por el propio estado).
 *  2. up_users.roles.extra incluye 'repartidor' (rol otorgado al aprobar,
 *     merge aditivo; se conserva durante suspensión, por eso se exigen
 *     rol Y estado).
 *  3. Al menos un vehículo delivery-vehicle.validation_status === 'verificado'
 *     (bicicleta, bicicleta eléctrica o motocicleta; los tres comparten el
 *     mismo límite de distancia en el MVP).
 *  4. Ubicación reciente en driver_locations (time dentro de
 *     REPARTIDOR_UBICACION_MAX_MIN) con coords válidas, a menos de
 *     RADIO_REPARTIDOR_KM (10 km) del restaurante. Se usa la ÚLTIMA lectura
 *     del repartidor.
 *  5. Sin entrega Food activa asignada: sin food-delivery con
 *     provider='ciudadan', repartidor = usuario y status en
 *     pending|processing|pickup|in_transit.
 *
 * La distancia del radio es haversine (prefiltro de radio geométrico, como el
 * bbox de conductores-cercanos pero circular y en JS portable entre sqlite y
 * mysql). NO sustituye a la distancia de ruta: la distancia de ENTREGA
 * (restaurante→cliente) siempre es por calles (servicio de rutas).
 */

const { UIDS, ROL_REPARTIDOR, FOOD_DELIVERY_ESTADOS_OCUPADOS, RADIO_REPARTIDOR_KM, ubicacionRepartidorMaxMin } = require('../utils/constants');

const TIERRA_RADIO_KM = 6371;

/** Distancia haversine en km (solo para el radio de repartidores). */
function haversineKm(lat1, lng1, lat2, lng2) {
  const aRadianes = (grados) => (Number(grados) * Math.PI) / 180;
  const dLat = aRadianes(lat2 - lat1);
  const dLng = aRadianes(lng2 - lng1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aRadianes(lat1)) * Math.cos(aRadianes(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * TIERRA_RADIO_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

const idDe = (relacion) => {
  if (relacion == null) return null;
  if (typeof relacion === 'object') return Number(relacion.id) || null;
  const numero = Number(relacion);
  return Number.isFinite(numero) ? numero : null;
};

const rolesExtraDe = (user) => {
  const roles = user?.roles;
  if (!roles) return [];
  const extra = typeof roles === 'object' && !Array.isArray(roles) ? roles.extra : null;
  return Array.isArray(extra) ? extra : [];
};

/** Parse tolerante del JSON coords de driver_locations (viene como string en la BD real). */
function extraerCoords(crudo) {
  if (!crudo) return null;
  let valor = crudo;
  if (typeof valor === 'string') {
    try {
      valor = JSON.parse(valor);
    } catch {
      return null;
    }
  }
  if (typeof valor !== 'object') return null;
  const lat = Number(valor.lat);
  const lng = Number(valor.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/** ¿La lectura de ubicación sigue suficientemente reciente? */
function ubicacionFresca(time) {
  if (!time) return false;
  const momento = new Date(time).getTime();
  if (!Number.isFinite(momento)) return false;
  const maxMs = ubicacionRepartidorMaxMin() * 60 * 1000;
  return Date.now() - momento <= maxMs;
}

/** Última ubicación (mayor time, desempate por id) por repartidor. */
function ultimaUbicacionPorRepartidor(ubicaciones) {
  const ultimas = new Map();
  for (const fila of ubicaciones || []) {
    const userId = idDe(fila.driver_id);
    if (userId == null) continue;
    const coords = extraerCoords(fila.coords);
    if (!coords) continue;
    const momento = new Date(fila.time).getTime() || 0;
    const previa = ultimas.get(userId);
    if (!previa || momento >= previa.momento) {
      ultimas.set(userId, { coords, momento, time: fila.time });
    }
  }
  return ultimas;
}

/**
 * Busca repartidores elegibles dentro del radio del restaurante.
 * Devuelve conteos por motivo de descarte para observabilidad (logs), sin
 * datos personales.
 */
async function buscarRepartidoresElegibles({ lat, lng }) {
  const descartes = {
    sin_rol: 0,
    perfil_no_aprobado: 0,
    sin_vehiculo_verificado: 0,
    sin_ubicacion_reciente: 0,
    fuera_de_radio: 0,
    ocupado: 0,
  };

  // 1. Expedientes aprobados con usuario y vehículos populados.
  const perfiles = await strapi.db.query(UIDS.DELIVERY_PROFILE).findMany({
    where: { status: 'approved' },
    populate: { user: true, vehicles: true },
  });

  // 2. Ids de repartidores ocupados (entrega ciudadan activa asignada).
  const entregasActivas = await strapi.db.query(UIDS.FOOD_DELIVERY).findMany({
    where: { provider: 'ciudadan', status: { $in: FOOD_DELIVERY_ESTADOS_OCUPADOS } },
  });
  const ocupados = new Set();
  for (const entrega of entregasActivas || []) {
    const id = idDe(entrega.repartidor);
    if (id != null) ocupados.add(id);
  }

  // 3. Última ubicación por repartidor.
  const ubicaciones = await strapi.db.query(UIDS.DRIVER_LOCATION).findMany({});
  const ultimas = ultimaUbicacionPorRepartidor(ubicaciones);

  const elegibles = [];
  const vistos = new Set();

  for (const perfil of perfiles || []) {
    const user = perfil.user;
    const userId = idDe(user);
    if (userId == null || vistos.has(userId)) {
      descartes.perfil_no_aprobado += 1;
      continue;
    }
    vistos.add(userId);

    if (!rolesExtraDe(user).includes(ROL_REPARTIDOR)) {
      descartes.sin_rol += 1;
      continue;
    }

    const vehiculos = Array.isArray(perfil.vehicles) ? perfil.vehicles : [];
    const tieneVehiculoVerificado = vehiculos.some(
      (v) => v && v.validation_status === 'verificado'
    );
    if (!tieneVehiculoVerificado) {
      descartes.sin_vehiculo_verificado += 1;
      continue;
    }

    if (ocupados.has(userId)) {
      descartes.ocupado += 1;
      continue;
    }

    const ubicacion = ultimas.get(userId);
    if (!ubicacion || !ubicacionFresca(ubicacion.time)) {
      descartes.sin_ubicacion_reciente += 1;
      continue;
    }

    const distanciaKm = haversineKm(lat, lng, ubicacion.coords.lat, ubicacion.coords.lng);
    if (distanciaKm > RADIO_REPARTIDOR_KM) {
      descartes.fuera_de_radio += 1;
      continue;
    }

    elegibles.push({
      usuarioId: userId,
      distanciaKm: Number(distanciaKm.toFixed(3)),
      tiposVehiculo: vehiculos
        .filter((v) => v && v.validation_status === 'verificado' && v.type)
        .map((v) => v.type),
    });
  }

  elegibles.sort((a, b) => a.distanciaKm - b.distanciaKm);

  return { total: elegibles.length, repartidores: elegibles, descartes };
}

/** Identificador corto sin datos personales para logs de disponibilidad. */
function resumenDisponibilidad({ total, descartes }) {
  return { total, descartes };
}

// Exportado para pruebas unitarias del radio.
module.exports = {
  haversineKm,
  extraerCoords,
  ubicacionFresca,
  ultimaUbicacionPorRepartidor,
  buscarRepartidoresElegibles,
  resumenDisponibilidad,
};

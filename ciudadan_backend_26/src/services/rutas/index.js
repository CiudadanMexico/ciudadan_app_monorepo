'use strict';

/**
 * Servicio de rutas POR CALLES, compartido (MVP cotizaciones de envío Food).
 *
 * Centraliza la integración que hoy vive dispersa (conductores-cercanos y
 * socket-service/calculateFare llaman a Google Directions por su cuenta).
 *
 * Proveedores soportados (env RUTA_PROVEEDOR):
 *  - 'google' (default): Google Maps Directions API. Es el proveedor que el
 *    proyecto ya usa en backend. La llave se resuelve en este orden:
 *    RUTA_GOOGLE_KEY || GOOGLE_MAPS_API_KEY || GEOCODING_KEY (la última es la
 *    única presente en el .env real y la que ya usa calculate-fare para
 *    Directions). Costo: dentro de la cuota mensual gratuita de Google Maps
 *    Platform; producción debe presupuestar consumo.
 *  - 'osrm': OSRM (licencia BSD-2, datos OSM, cobertura MX buena). Sin costo y
 *    sin credenciales. Por defecto apunta al demo público
 *    (router.project-osrm.org, SIN SLA — solo desarrollo); en producción se
 *    recomienda un OSRM auto-alojado o comercial vía RUTA_OSRM_URL.
 *
 * CONTRATO (ambos proveedores):
 *   obtenerDistanciaRuta({ origen: {lat,lng}, destino: {lat,lng} })
 *     => { distanciaMetros, duracionSegundos, proveedor }
 *
 * ERRORES — fail-closed: si el proveedor falla, no hay ruta o las coordenadas
 * no se pueden ajustar a la red vial, se lanza RutaError con codigo
 * 'RUTA_NO_DISPONIBLE'. NUNCA se sustituye la distancia por línea recta/
 * haversine (spec §3): sin ruta válida no hay cotización de Ciudadan.
 */

const RUTA_PROVEEDOR_DEFAULT = 'google';
const RUTA_TIMEOUT_MS_DEFAULT = 5000;
const GOOGLE_DIRECTIONS_URL = 'https://maps.googleapis.com/maps/api/directions/json';
const OSRM_URL_DEFAULT = 'https://router.project-osrm.org';

/** Error con codigo seguro (no expone URLs, keys ni detalles del proveedor). */
class RutaError extends Error {
  constructor(codigo, mensaje, causa) {
    super(mensaje);
    this.name = 'RutaError';
    this.codigo = codigo;
    this.status = 502;
    this.expose = true;
    if (causa) this.causa = causa;
  }
}

const proveedorActivo = () =>
  String(process.env.RUTA_PROVEEDOR || RUTA_PROVEEDOR_DEFAULT).toLowerCase();

const timeoutMs = () => {
  const valor = Number(process.env.RUTA_TIMEOUT_MS);
  return Number.isFinite(valor) && valor > 0 ? valor : RUTA_TIMEOUT_MS_DEFAULT;
};

const googleKey = () =>
  process.env.RUTA_GOOGLE_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  process.env.GEOCODING_KEY ||
  null;

const osrmUrl = () => {
  const base = String(process.env.RUTA_OSRM_URL || OSRM_URL_DEFAULT);
  return base.replace(/\/+$/, '');
};

function coordenadasValidas({ lat, lng }) {
  const latNum = Number(lat);
  const lngNum = Number(lng);
  return (
    Number.isFinite(latNum) &&
    Number.isFinite(lngNum) &&
    latNum >= -90 &&
    latNum <= 90 &&
    lngNum >= -180 &&
    lngNum <= 180
  );
}

/** fetch con timeout (AbortController). Nunca lanza por sí mismo el abort. */
async function fetchConTimeout(url, opciones = {}) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs());
  try {
    return await fetch(url, { ...opciones, signal: controlador.signal });
  } finally {
    clearTimeout(temporizador);
  }
}

async function respuestaJsonSegura(respuesta) {
  try {
    return await respuesta.json();
  } catch {
    return null;
  }
}

/**
 * Google Maps Directions.
 * status 'OK' => routes[0].legs[].distance.value (metros) / duration.value (seg).
 * ZERO_RESULTS / cualquier otro status => no hay ruta.
 */
async function distanciaGoogle(origen, destino) {
  const key = googleKey();
  if (!key) {
    throw new RutaError('RUTA_NO_DISPONIBLE', 'Falta la llave del proveedor de rutas');
  }
  const url =
    `${GOOGLE_DIRECTIONS_URL}?origin=${encodeURIComponent(`${origen.lat},${origen.lng}`)}` +
    `&destination=${encodeURIComponent(`${destino.lat},${destino.lng}`)}` +
    `&mode=driving&key=${encodeURIComponent(key)}`;

  let respuesta;
  try {
    respuesta = await fetchConTimeout(url);
  } catch (error) {
    throw new RutaError('RUTA_NO_DISPONIBLE', 'El proveedor de rutas no respondió', error);
  }

  const data = await respuestaJsonSegura(respuesta);
  if (!respuesta.ok || !data || data.status !== 'OK' || !Array.isArray(data.routes) || !data.routes.length) {
    throw new RutaError('RUTA_NO_DISPONIBLE', 'No fue posible calcular la ruta');
  }

  const legs = data.routes[0].legs || [];
  const distanciaMetros = legs.reduce(
    (acum, leg) => acum + Number(leg?.distance?.value || 0),
    0
  );
  const duracionSegundos = legs.reduce(
    (acum, leg) => acum + Number(leg?.duration?.value || 0),
    0
  );

  if (!Number.isFinite(distanciaMetros) || distanciaMetros <= 0) {
    throw new RutaError('RUTA_NO_DISPONIBLE', 'La ruta calculada no es válida');
  }

  return { distanciaMetros: Math.round(distanciaMetros), duracionSegundos: Math.round(duracionSegundos) };
}

/**
 * OSRM route service.
 * GET {base}/route/v1/driving/{lng},{lat};{lng},{lat}?overview=false
 * code 'Ok' => routes[0].distance (metros) / routes[0].duration (seg).
 * code 'NoRoute'/'NoSegment' => no hay ruta.
 */
async function distanciaOsrm(origen, destino) {
  const url =
    `${osrmUrl()}/route/v1/driving/` +
    `${encodeURIComponent(`${destino.lng},${destino.lat}`)};${encodeURIComponent(`${origen.lng},${origen.lat}`)}` +
    `?overview=false`;

  let respuesta;
  try {
    respuesta = await fetchConTimeout(url);
  } catch (error) {
    throw new RutaError('RUTA_NO_DISPONIBLE', 'El proveedor de rutas no respondió', error);
  }

  const data = await respuestaJsonSegura(respuesta);
  if (!respuesta.ok || !data || data.code !== 'Ok' || !Array.isArray(data.routes) || !data.routes.length) {
    throw new RutaError('RUTA_NO_DISPONIBLE', 'No fue posible calcular la ruta');
  }

  const ruta = data.routes[0];
  const distanciaMetros = Number(ruta?.distance);
  if (!Number.isFinite(distanciaMetros) || distanciaMetros <= 0) {
    throw new RutaError('RUTA_NO_DISPONIBLE', 'La ruta calculada no es válida');
  }

  return {
    distanciaMetros: Math.round(distanciaMetros),
    duracionSegundos: Math.round(Number(ruta?.duration) || 0),
  };
}

/**
 * Distancia por calles entre dos puntos. Punto único de entrada para todo el
 * backend (cotizaciones Food; reutilizable por otros módulos).
 */
async function obtenerDistanciaRuta({ origen, destino }) {
  if (!coordenadasValidas(origen || {})) {
    throw new RutaError('RUTA_NO_DISPONIBLE', 'Coordenadas de origen inválidas');
  }
  if (!coordenadasValidas(destino || {})) {
    throw new RutaError('RUTA_NO_DISPONIBLE', 'Coordenadas de destino inválidas');
  }

  const proveedor = proveedorActivo();
  let resultado;
  if (proveedor === 'osrm') {
    resultado = await distanciaOsrm(origen, destino);
  } else {
    resultado = await distanciaGoogle(origen, destino);
  }

  return { ...resultado, proveedor };
}

module.exports = {
  RutaError,
  obtenerDistanciaRuta,
  coordenadasValidas,
  proveedorActivo,
  googleKey,
};

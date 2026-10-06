/**
 * geoUtils.js — Utilidades puras para GeoNetworkMap.
 *
 * Funciones de proyección cartográfica en SVG, formateadores de moneda/métrica
 * y manipulación de propiedades anidadas de forma segura.
 */

/**
 * Resuelve una propiedad anidada con notación de punto (ej: "drivers.total").
 */
export function resolveNestedField(obj, path) {
  if (!obj || !path) return null;
  const parts = path.split('.');
  let curr = obj;
  for (const part of parts) {
    if (curr === null || curr === undefined) return null;
    curr = curr[part];
  }
  return curr;
}

/**
 * Formateador de moneda MXN.
 * Si el valor es null/undefined o NaN, devuelve null para que la UI lo oculte.
 */
export function formatMoneyMXN(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Formateador de métricas numéricas con notación compacta opcional (ej: 30.9K, 1,250).
 */
export function formatMetric(value, compact = false) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  if (compact && Math.abs(num) >= 1000) {
    return new Intl.NumberFormat('es-MX', {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1,
    }).format(num);
  }
  return new Intl.NumberFormat('es-MX').format(num);
}

/**
 * Normaliza un identificador de región (limpia espacios, mayúsculas).
 */
export function normalizeRegionId(id) {
  if (!id) return '';
  return String(id).trim().toUpperCase();
}

/**
 * Proyección Mercator simplificada (lon, lat en grados -> [x, y] normalizados).
 */
export function mercatorProject(lon, lat) {
  const radLon = (lon * Math.PI) / 180;
  const radLat = (lat * Math.PI) / 180;
  const y = Math.log(Math.tan(Math.PI / 4 + radLat / 2));
  return [radLon, y];
}

/**
 * Convierte un Feature GeoJSON (Polygon o MultiPolygon) en un string "d" de SVG path.
 * `projectFn` mapea coordenadas [lon, lat] a [x, y] en el viewBox del SVG.
 */
export function featureToSvgPath(feature, projectFn) {
  if (!feature || !feature.geometry) return '';
  const { type, coordinates } = feature.geometry;

  const ringToPath = (ring) => {
    if (!ring || ring.length === 0) return '';
    let d = '';
    for (let i = 0; i < ring.length; i++) {
      const [px, py] = projectFn(ring[i][0], ring[i][1]);
      d += i === 0 ? `M ${px.toFixed(2)} ${py.toFixed(2)}` : ` L ${px.toFixed(2)} ${py.toFixed(2)}`;
    }
    d += ' Z';
    return d;
  };

  if (type === 'Polygon') {
    return coordinates.map(ringToPath).join(' ');
  }

  if (type === 'MultiPolygon') {
    return coordinates
      .map((polygon) => polygon.map(ringToPath).join(' '))
      .join(' ');
  }

  return '';
}

/**
 * Crea una función de proyección a partir de un FeatureCollection o lista de features
 * que escala y centra las geometrías dentro del canvas SVG con padding.
 */
export function createMapProjection(features, width = 1000, height = 620, padding = 26) {
  if (!features || features.length === 0) {
    return {
      project: (lon, lat) => [lon, lat],
      bounds: { minX: 0, maxX: width, minY: 0, maxY: height },
    };
  }

  let minLonRad = Infinity;
  let maxLonRad = -Infinity;
  let minLatMerc = Infinity;
  let maxLatMerc = -Infinity;

  const examineRing = (ring) => {
    for (let i = 0; i < ring.length; i++) {
      const [mX, mY] = mercatorProject(ring[i][0], ring[i][1]);
      if (mX < minLonRad) minLonRad = mX;
      if (mX > maxLonRad) maxLonRad = mX;
      if (mY < minLatMerc) minLatMerc = mY;
      if (mY > maxLatMerc) maxLatMerc = mY;
    }
  };

  for (const feat of features) {
    const g = feat.geometry;
    if (!g) continue;
    if (g.type === 'Polygon') {
      g.coordinates.forEach(examineRing);
    } else if (g.type === 'MultiPolygon') {
      g.coordinates.forEach((poly) => poly.forEach(examineRing));
    }
  }

  const rawWidth = maxLonRad - minLonRad;
  const rawHeight = maxLatMerc - minLatMerc;

  const drawWidth = width - 2 * padding;
  const drawHeight = height - 2 * padding;

  const scale = Math.min(drawWidth / rawWidth, drawHeight / rawHeight);

  const offsetX = padding + (drawWidth - rawWidth * scale) / 2;
  const offsetY = padding + (drawHeight - rawHeight * scale) / 2;

  const project = (lon, lat) => {
    const [mX, mY] = mercatorProject(lon, lat);
    const x = (mX - minLonRad) * scale + offsetX;
    const y = (maxLatMerc - mY) * scale + offsetY;
    return [x, y];
  };

  return {
    project,
    bounds: { minLonRad, maxLonRad, minLatMerc, maxLatMerc, scale, offsetX, offsetY },
  };
}

/**
 * Resuelve la opacidad o intensidad del color a partir de un valor numérico y rango.
 */
export function calculateIntensity(value, min = 0, max = 100, minOpacity = 0.2, maxOpacity = 0.85) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return null;
  }
  const num = Number(value);
  if (max <= min) return minOpacity;
  const clamped = Math.max(min, Math.min(max, num));
  const ratio = (clamped - min) / (max - min);
  return minOpacity + ratio * (maxOpacity - minOpacity);
}

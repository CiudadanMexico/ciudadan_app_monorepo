const EARTH_RADIUS_KM = 6371;

const toRadians = (value) => (value * Math.PI) / 180;

export const calculateDistanceKm = (from, to) => {
  if (!from || !to) return null;
  if (typeof from.lat !== 'number' || typeof from.lng !== 'number') return null;
  if (typeof to.lat !== 'number' || typeof to.lng !== 'number') return null;

  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

export const isWithinDistanceKm = (from, to, maxDistanceKm = 7) => {
  const distanceKm = calculateDistanceKm(from, to);
  console.log('[geo] distanceKm:', distanceKm);
  return distanceKm !== null && distanceKm <= maxDistanceKm;
};

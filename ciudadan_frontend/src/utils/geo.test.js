import { calculateDistanceKm, isWithinDistanceKm } from './geo';

describe('geo distance helpers', () => {
  it('calculates an approximate distance in kilometers', () => {
    const distanceKm = calculateDistanceKm({ lat: 0, lng: 0 }, { lat: 0.063, lng: 0 });
    expect(distanceKm).toBeCloseTo(7, 0);
  });

  it('filters requests that are within the 7 km threshold', () => {
    const driverCoords = { lat: 19.432607, lng: -99.133209 };
    const nearPickup = { lat: 19.49, lng: -99.133209 };
    const farPickup = { lat: 19.5, lng: -99.133209 };

    expect(isWithinDistanceKm(driverCoords, nearPickup, 7)).toBe(true);
    expect(isWithinDistanceKm(driverCoords, farPickup, 7)).toBe(false);
  });
});

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two coordinates in kilometres (haversine). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Default map centre — Tashkent. */
export const DEFAULT_CENTER = { lat: 41.2995, lng: 69.2401 };

/** Uzbekistan bounding box used to validate coordinates. */
export const UZ_BOUNDS = { minLat: 37.1, maxLat: 45.6, minLng: 55.9, maxLng: 73.2 };

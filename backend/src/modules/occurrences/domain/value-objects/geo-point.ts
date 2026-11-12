export interface GeoPoint {
  readonly lat: number;
  readonly lng: number;
}

export function isValidGeoPoint(point: GeoPoint): boolean {
  return Number.isFinite(point.lat) && Number.isFinite(point.lng) &&
    point.lat >= -90 && point.lat <= 90 &&
    point.lng >= -180 && point.lng <= 180;
}

/** Projeção pública aprox. 100 m, sem alterar a coordenada original. */
export function approximateGeoPoint(point: GeoPoint): GeoPoint {
  const round = (value: number) => Math.round(value * 1000) / 1000;
  return { lat: round(point.lat), lng: round(point.lng) };
}

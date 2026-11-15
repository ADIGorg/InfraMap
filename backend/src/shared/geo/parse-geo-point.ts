export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Parseia coordenadas geográficas de múltiplos formatos:
 *  - GeoJSON Point: { type: "Point", coordinates: [lng, lat] }
 *  - Objeto normalizado: { lat, lng }
 *  - WKT: "POINT(lng lat)"
 *
 * Lança erro para formato desconhecido ou valores fora de faixa válida.
 * NUNCA retorna (0,0) silenciosamente.
 */
export function parseGeoPoint(raw: unknown): GeoPoint {
  let lat: number | undefined;
  let lng: number | undefined;

  if (typeof raw === "object" && raw !== null) {
    const point = raw as {
      type?: string;
      coordinates?: unknown;
      lat?: unknown;
      lng?: unknown;
    };
    if (
      point.type === "Point" &&
      Array.isArray(point.coordinates) &&
      point.coordinates.length === 2
    ) {
      [lng, lat] = point.coordinates as [number, number];
    } else if (
      typeof point.lat === "number" &&
      typeof point.lng === "number"
    ) {
      lat = point.lat;
      lng = point.lng;
    }
  } else if (typeof raw === "string") {
    const match = raw.match(
      /^POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)$/i
    );
    if (match) {
      lng = Number(match[1]);
      lat = Number(match[2]);
    }
  }

  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    throw new Error(
      "Coordenada geográfica inválida ou em formato não suportado."
    );
  }

  return { lat, lng };
}
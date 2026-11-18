import type { AdminMapOccurrence, Bounds, GeoPoint, ActiveStatus } from './admin-occurrences.service';

export type MapViewport = { center: GeoPoint; zoom: number };

const STATUS_COLORS: Record<ActiveStatus, string> = {
  RECEIVED: '#95A5A6',
  UNDER_ANALYSIS: '#F1C40F',
  CONFIRMED: '#3498DB',
  IN_SERVICE: '#E67E22',
};

export function pinColor(status: ActiveStatus): string {
  return STATUS_COLORS[status];
}

export function boundsFromLeaflet(bounds: {
  getSouth: () => number;
  getNorth: () => number;
  getWest: () => number;
  getEast: () => number;
}): Bounds {
  return {
    minLat: bounds.getSouth(),
    maxLat: bounds.getNorth(),
    minLng: bounds.getWest(),
    maxLng: bounds.getEast(),
  };
}

export function validPoint(position: GeoPoint): boolean {
  return Number.isFinite(position.lat) && Number.isFinite(position.lng)
    && position.lat >= -90 && position.lat <= 90
    && position.lng >= -180 && position.lng <= 180;
}

export function formatCoords(position: GeoPoint): string {
  return position.lat.toFixed(6) + ', ' + position.lng.toFixed(6);
}

export function shortOccurrenceId(id: string): string {
  return '#' + id.slice(0, 8);
}

export function safeDescription(item: AdminMapOccurrence): string {
  return item.description.trim() || 'Sem descrição informada';
}

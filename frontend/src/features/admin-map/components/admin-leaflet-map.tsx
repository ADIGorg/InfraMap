import { useEffect, useMemo, useRef } from 'react';
import { divIcon, type Marker as LeafletMarker } from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { StatusBadge } from '@/shared/components/status-badge';
import { OccurrenceAddress } from '@/shared/components/occurrence-address';
import {
  isActiveStatus,
  type AdminMapOccurrence,
  type ActiveStatus,
  type Bounds,
  type GeoPoint,
} from '../services/admin-occurrences.service';
import {
  boundsFromLeaflet, pinColor, safeDescription, shortOccurrenceId, validPoint, type MapViewport,
} from '../services/map-presentation';

// Tile padrão oficial; use com cache HTTP e a atribuição exigida pela OSMF.
// Para alto volume, avaliar provedor dedicado. Não fazer pré-carregamento em massa.
export const OPENSTREETMAP_TILES_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OPENSTREETMAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>';

const BRAZIL_CENTER: [number, number] = [-14.235, -51.9253];

function createPin(color: string) {
  // Cor é derivada exclusivamente de constantes internas, nunca de dados da API.
  return divIcon({
    className: 'inframap-marker',
    html: '<span class="inframap-map-pin" style="background-color:' + color +
      '"><span class="inframap-map-pin-dot"></span></span>',
    iconSize: [30, 42],
    iconAnchor: [15, 40],
    popupAnchor: [0, -38],
  });
}

const ACTIVE_ICONS: Record<ActiveStatus, ReturnType<typeof divIcon>> = {
  RECEIVED: createPin(pinColor('RECEIVED')),
  UNDER_ANALYSIS: createPin(pinColor('UNDER_ANALYSIS')),
  CONFIRMED: createPin(pinColor('CONFIRMED')),
  IN_SERVICE: createPin(pinColor('IN_SERVICE')),
};
const EDIT_ICON = createPin('#1B5275');

function VisibleAreaListener({
  onAreaChanged, onViewportChanged,
}: {
  onAreaChanged: (bounds: Bounds) => void;
  onViewportChanged: (viewport: MapViewport) => void;
}) {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      onAreaChanged(boundsFromLeaflet(map.getBounds()));
      onViewportChanged({ center: { lat: center.lat, lng: center.lng }, zoom: map.getZoom() });
    },
  });
  // Registrar também a primeira viewport; controles +/− do Leaflet geram moveend.
  useEffect(() => {
    const center = map.getCenter();
    onAreaChanged(boundsFromLeaflet(map.getBounds()));
    onViewportChanged({ center: { lat: center.lat, lng: center.lng }, zoom: map.getZoom() });
  }, [map, onAreaChanged, onViewportChanged]);
  return null;
}

function ClickToAdjust({ onChange }: { onChange: (value: GeoPoint) => void }) {
  useMapEvents({
    click: (event) => onChange({ lat: event.latlng.lat, lng: event.latlng.lng }),
  });
  return null;
}

function CenterOnPoint({ position }: { position: GeoPoint }) {
  const map = useMap();
  const { lat, lng } = position;
  useEffect(() => {
    if (validPoint({ lat, lng })) map.panTo([lat, lng]);
  }, [map, lat, lng]);
  return null;
}

interface AdminLeafletMapProps {
  items: AdminMapOccurrence[];
  viewport: MapViewport | null;
  onViewportChanged: (viewport: MapViewport) => void;
  selected: AdminMapOccurrence | null;
  onSelect: (id: string | null) => void;
  onAdjust: (item: AdminMapOccurrence) => void;
  onAreaChanged: (bounds: Bounds) => void;
  onTileError: () => void;
}

export function AdminLeafletMap({
  items, viewport, onViewportChanged, selected, onSelect, onAdjust, onAreaChanged, onTileError,
}: AdminLeafletMapProps) {
  const positions = items.map(item => item.location).filter(validPoint);
  const initialCenter = positions[0];
  const lats = positions.map(point => point.lat);
  const lngs = positions.map(point => point.lng);
  const south = Math.min(...lats);
  const north = Math.max(...lats);
  const west = Math.min(...lngs);
  const east = Math.max(...lngs);
  // Enquadrar ocorrencias ativas, nao apenas a primeira posicao retornada.
  const initialBounds: [[number, number], [number, number]] | undefined =
    positions.length > 1 && (south !== north || west !== east)
      ? [[south, west], [north, east]]
      : undefined;
  return (
    <MapContainer
      bounds={!viewport ? initialBounds : undefined}
      boundsOptions={{ padding: [30, 30] }}
      center={initialBounds && !viewport ? undefined : viewport
        ? [viewport.center.lat, viewport.center.lng]
        : initialCenter
          ? [initialCenter.lat, initialCenter.lng]
          : BRAZIL_CENTER}
      zoom={initialBounds && !viewport ? undefined : (viewport?.zoom ?? (initialCenter ? 12 : 4))}
      minZoom={3}
      maxZoom={19}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        url={OPENSTREETMAP_TILES_URL}
        attribution={OPENSTREETMAP_ATTRIBUTION}
        maxZoom={19}
        eventHandlers={{ tileerror: onTileError }}
      />
      <VisibleAreaListener onAreaChanged={onAreaChanged} onViewportChanged={onViewportChanged} />
      {items.filter((item) => isActiveStatus(item.status)).map((item) => (
        <Marker
          key={item.id}
          position={[item.location.lat, item.location.lng]}
          icon={ACTIVE_ICONS[item.status as ActiveStatus]}
          title={'Ocorrência ' + shortOccurrenceId(item.id) + ': ' + item.category.name}
          eventHandlers={{ click: () => onSelect(item.id) }}
        />
      ))}
      {selected && isActiveStatus(selected.status) && (
        <Popup position={[selected.location.lat, selected.location.lng]}
          eventHandlers={{ remove: () => onSelect(null) }}>
          <div className="max-w-[260px] space-y-2 p-2 text-ink-primary">
            <div className="flex flex-wrap items-center gap-2">
              <strong>Ocorrência {shortOccurrenceId(selected.id)}</strong>
              <StatusBadge status={selected.status} />
            </div>
            <p className="font-semibold">{selected.category.name}</p>
            <p className="max-h-24 overflow-auto text-xs">{safeDescription(selected)}</p>
            <div className="text-xs"><OccurrenceAddress point={selected.location}/></div>
            <div className="flex flex-wrap gap-3 pt-2 text-sm">
              <Link to={'/admin/occurrences/' + selected.id}
                className="font-semibold text-brand-primary underline">
                Ver detalhes
              </Link>
              <button type="button" onClick={() => onAdjust(selected)}
                className="font-semibold text-brand-primary underline">
                Ajustar posição
              </button>
            </div>
          </div>
        </Popup>
      )}
    </MapContainer>
  );
}

function DraggablePosition({ position, onChange }: {
  position: GeoPoint; onChange: (point: GeoPoint) => void;
}) {
  const ref = useRef<LeafletMarker | null>(null);
  const handlers = useMemo(() => ({
    dragend: () => {
      const point = ref.current?.getLatLng();
      if (point) onChange({ lat: point.lat, lng: point.lng });
    },
  }), [onChange]);
  return (
    <Marker
      ref={ref}
      position={[position.lat, position.lng]}
      icon={EDIT_ICON}
      draggable
      eventHandlers={handlers}
    />
  );
}

export function AdjustmentLeafletMap({
  position, onChange, onTileError,
}: {
  position: GeoPoint;
  onChange: (point: GeoPoint) => void;
  onTileError: () => void;
}) {
  // Campo numérico temporariamente vazio gera NaN. Nunca repassar NaN ao Leaflet.
  const lastValid = useRef(position);
  if (validPoint(position)) lastValid.current = position;
  const mapPosition = lastValid.current;

  return (
    <MapContainer
      center={[mapPosition.lat, mapPosition.lng]}
      zoom={16}
      maxZoom={19}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        url={OPENSTREETMAP_TILES_URL}
        attribution={OPENSTREETMAP_ATTRIBUTION}
        maxZoom={19}
        eventHandlers={{ tileerror: onTileError }}
      />
      <ClickToAdjust onChange={onChange} />
      <CenterOnPoint position={mapPosition} />
      <DraggablePosition position={mapPosition} onChange={onChange} />
    </MapContainer>
  );
}

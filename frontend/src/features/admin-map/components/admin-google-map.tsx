import { AdvancedMarker, InfoWindow, Map, Pin } from '@vis.gl/react-google-maps';
import { Link } from 'react-router-dom';
import { env } from '@/config/env';
import { StatusBadge } from '@/shared/components/status-badge';
import {
  isActiveStatus,
  type AdminMapOccurrence,
  type Bounds,
  type GeoPoint,
} from '../services/admin-occurrences.service';
import { boundsFromGoogle, pinColor, safeDescription, shortOccurrenceId } from '../services/map-presentation';

const BRAZIL_CENTER = { lat: -14.235, lng: -51.9253 };

interface AdminGoogleMapProps {
  items: AdminMapOccurrence[];
  selected: AdminMapOccurrence | null;
  onSelect: (id: string | null) => void;
  onAdjust: (item: AdminMapOccurrence) => void;
  onAreaChanged: (bounds: Bounds) => void;
}

/** Mapa permanece desacoplado da API; apenas UI e eventos do Google. */
export function AdminGoogleMap({
  items, selected, onSelect, onAdjust, onAreaChanged,
}: AdminGoogleMapProps) {
  const initialCenter = items[0]?.location ?? BRAZIL_CENTER;

  return (
    <Map
      defaultCenter={initialCenter}
      defaultZoom={items.length ? 12 : 4}
      mapId={env.googleMapId}
      gestureHandling="greedy"
      className="h-full w-full"
      onIdle={(event) => {
        const bounds = event.map.getBounds()?.toJSON();
        if (bounds) onAreaChanged(boundsFromGoogle(bounds));
      }}
    >
      {items.filter((item) => isActiveStatus(item.status)).map((item) => (
        <AdvancedMarker
          key={item.id}
          position={item.location}
          title={'Ocorrência ' + shortOccurrenceId(item.id) + ': ' + item.category.name}
          onClick={() => onSelect(item.id)}
        >
          <Pin
            background={pinColor(item.status as 'RECEIVED' | 'UNDER_ANALYSIS' | 'CONFIRMED' | 'IN_SERVICE')}
            borderColor="#FFFFFF"
            glyphColor="#FFFFFF"
          />
        </AdvancedMarker>
      ))}
      {selected && isActiveStatus(selected.status) && (
        <InfoWindow
          position={selected.location}
          onCloseClick={() => onSelect(null)}
          headerDisabled
        >
          <div className="max-w-[260px] space-y-2 p-2 text-ink-primary">
            <div className="flex flex-wrap items-center gap-2">
              <strong>Ocorrência {shortOccurrenceId(selected.id)}</strong>
              <StatusBadge status={selected.status} />
            </div>
            <p className="font-semibold">{selected.category.name}</p>
            <p className="max-h-24 overflow-auto text-xs">{safeDescription(selected)}</p>
            <div className="flex flex-wrap gap-3 pt-2 text-sm">
              <Link to={'/admin/occurrences/' + selected.id} className="font-semibold text-brand-primary underline">
                Ver detalhes
              </Link>
              <button type="button" onClick={() => onAdjust(selected)}
                className="font-semibold text-brand-primary underline">
                Ajustar posição
              </button>
            </div>
          </div>
        </InfoWindow>
      )}
    </Map>
  );
}

export function AdjustmentGoogleMap({
  position,
  onChange,
}: { position: GeoPoint; onChange: (point: GeoPoint) => void }) {
  return (
    <Map
      defaultCenter={position}
      defaultZoom={16}
      mapId={env.googleMapId}
      className="h-full w-full"
      gestureHandling="greedy"
      onClick={(event) => {
        if (event.detail.latLng) onChange(event.detail.latLng);
      }}
    >
      <AdvancedMarker
        position={position}
        draggable
        onDragEnd={(event) => {
          if (event.latLng) {
            onChange({ lat: event.latLng.lat(), lng: event.latLng.lng() });
          }
        }}
      >
        <Pin background="#1B5275" glyphColor="#FFFFFF" borderColor="#FFFFFF" />
      </AdvancedMarker>
    </Map>
  );
}

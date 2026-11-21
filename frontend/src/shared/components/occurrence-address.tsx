import { useEffect, useState } from 'react';
import { reverseGeocode, type GeoPoint, type ResolvedAddress } from '../services/reverse-geocode';

export function OccurrenceAddress({ point }: { point: GeoPoint | null }) {
  const [address, setAddress] = useState<ResolvedAddress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const lat = point?.lat;
  const lng = point?.lng;

  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    let active = true;
    setLoading(true);
    setError(false);
    setAddress(null);
    void reverseGeocode({ lat, lng })
      .then((result) => { if (active) setAddress(result); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [lat, lng]);

  if (!point) return <span>Não informado</span>;
  return <span>
    {loading ? 'Consultando endereço…' : address?.formatted
      ?? (error ? 'Endereço temporariamente indisponível' : 'Endereço não identificado')}
    <span className="block text-xs text-ink-secondary">
      Coordenadas: {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
    </span>
  </span>;
}

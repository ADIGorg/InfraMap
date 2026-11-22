export interface GeoPoint { lat: number; lng: number }
export interface ResolvedAddress {
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  formatted: string;
}
const cache = new Map<string, ResolvedAddress | null>();
let queue: Promise<unknown> = Promise.resolve();
let lastRequest = 0;
const keyFor = (p: GeoPoint) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
/** Consulta sob demanda. Não usar ao arrastar o marcador nem para cada item da lista. */
export function reverseGeocode(point: GeoPoint): Promise<ResolvedAddress | null> {
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng) ||
      Math.abs(point.lat) > 90 || Math.abs(point.lng) > 180) return Promise.resolve(null);
  const key = keyFor(point);
  if (cache.has(key)) return Promise.resolve(cache.get(key) ?? null);
  const task = queue.catch(() => undefined).then(async () => {
    if (cache.has(key)) return cache.get(key) ?? null;
    const delay = Math.max(0, 1100 - (Date.now() - lastRequest));
    if (delay) await pause(delay);
    lastRequest = Date.now();
    const params = new URLSearchParams({
      lat: String(point.lat), lon: String(point.lng),
      format: 'jsonv2', addressdetails: '1', 'accept-language': 'pt-BR',
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Geocodificação indisponível (${response.status}).`);
    const payload = await response.json() as { address?: Record<string,string>; display_name?: string; error?: string };
    if (payload.error || !payload.address) { cache.set(key, null); return null; }
    const a = payload.address;
    const street = a.road ?? a.pedestrian ?? a.residential ?? a.footway ?? null;
    const number = a.house_number ?? null;
    const neighborhood = a.suburb ?? a.neighbourhood ?? a.quarter ?? a.city_district ?? null;
    const city = a.city ?? a.town ?? a.municipality ?? a.village ?? null;
    const state = a.state ?? null;
    const postcode = a.postcode ?? null;
    const formatted = [
      [street, number].filter(Boolean).join(', '), neighborhood,
      [city, state].filter(Boolean).join(' - '),
      postcode ? `CEP ${postcode}` : null,
    ].filter(Boolean).join(' · ') || payload.display_name || 'Endereço não identificado';
    const value = { street, number, neighborhood, city, state, postcode, formatted };
    cache.set(key, value);
    return value;
  });
  queue = task.then(() => undefined, () => undefined);
  return task;
}

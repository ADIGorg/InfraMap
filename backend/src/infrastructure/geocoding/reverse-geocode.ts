/** Geocodificação reversa de baixo volume para e-mails administrativos.
 * Nominatim público: limite absoluto de 1 requisição/segundo por processo.
 * Para várias instâncias ou volume alto, usar cache distribuído/provedor dedicado.
 */
import { z } from "zod";

export interface GeoPoint { lat: number; lng: number }

const responseSchema = z.object({
  address: z.object({
    road: z.string().optional(),
    pedestrian: z.string().optional(),
    residential: z.string().optional(),
    house_number: z.string().optional(),
    suburb: z.string().optional(),
    neighbourhood: z.string().optional(),
    quarter: z.string().optional(),
    city: z.string().optional(),
    town: z.string().optional(),
    village: z.string().optional(),
    municipality: z.string().optional(),
    county: z.string().optional(),
    state: z.string().optional(),
    postcode: z.string().optional(),
  }).optional(),
});

const cache = new Map<string, { value: string | null; expires: number }>();
let nextRequestAt = 0;
const MAX_ENTRIES = 500;

function formatAddress(address: NonNullable<z.infer<typeof responseSchema>["address"]>): string | null {
  const street = address.road ?? address.pedestrian ?? address.residential;
  const streetLine = street ? [street, address.house_number].filter(Boolean).join(", ") : null;
  const neighborhood = address.suburb ?? address.neighbourhood ?? address.quarter;
  const city = address.city ?? address.town ?? address.village ?? address.municipality ?? address.county;
  const cityState = [city, address.state].filter(Boolean).join(" - ");
  const pieces = [streetLine, neighborhood, cityState, address.postcode ? `CEP ${address.postcode}` : null]
    .filter((part): part is string => Boolean(part));
  return pieces.length ? pieces.join(" | ") : null;
}

export async function reverseGeocodeForEmail(point: GeoPoint): Promise<string | null> {
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)
    || Math.abs(point.lat) > 90 || Math.abs(point.lng) > 180) return null;
  const key = `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  const now = Date.now();
  const scheduledAt = Math.max(now, nextRequestAt);
  nextRequestAt = scheduledAt + 1100;
  if (scheduledAt > now) await new Promise<void>(resolve => setTimeout(resolve, scheduledAt - now));

  let value: string | null = null;
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("zoom", "18");
    url.searchParams.set("lat", String(point.lat));
    url.searchParams.set("lon", String(point.lng));
    const response = await fetch(url, {
      headers: { "User-Agent": "InfraMap-Academic/1.0", "Accept-Language": "pt-BR,pt;q=0.9" },
      signal: AbortSignal.timeout(4000),
    });
    if (response.ok) {
      const parsed = responseSchema.safeParse(await response.json());
      if (parsed.success && parsed.data.address) value = formatAddress(parsed.data.address);
    }
  } catch {
    // A indisponibilidade de geocodificação não deve bloquear o encaminhamento.
  }
  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value ?? "");
  cache.set(key, { value, expires: Date.now() + (value ? 24 * 60 * 60_000 : 10 * 60_000) });
  return value;
}

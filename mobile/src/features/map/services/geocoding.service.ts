import * as Location from 'expo-location';

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude: lat,
      longitude: lng,
    });

    if (!results.length) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

    const r = results[0];
    const parts = [r.street, r.streetNumber, r.district, r.city].filter(Boolean);
    return parts.length ? parts.join(', ') : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}
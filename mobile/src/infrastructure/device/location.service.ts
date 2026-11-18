import * as Location from 'expo-location';
import { AppError } from '@/shared/errors/app-error';

export interface DeviceLocation {
  lat: number;
  lng: number;
  accuracy: number | null;
  source: 'GPS';
}

const GPS_TIMEOUT_MS = 10_000;

export function validateCoordinates(
  lat: number,
  lng: number,
): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export async function getCurrentLocation(): Promise<DeviceLocation> {
  const permission =
    await Location.requestForegroundPermissionsAsync();

  if (permission.status !== 'granted') {
    throw new AppError(
      403,
      'LOCATION_DENIED',
      'Permissão de localização negada. Selecione o ponto no mapa.',
    );
  }

  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new AppError(
          408,
          'LOCATION_TIMEOUT',
          'O GPS demorou demais. Selecione o ponto no mapa.',
        ),
      );
    }, GPS_TIMEOUT_MS);
  });

  try {
    const locationPromise = Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const result = await Promise.race([
      locationPromise,
      timeoutPromise,
    ]);

    const lat = result.coords.latitude;
    const lng = result.coords.longitude;

    if (!validateCoordinates(lat, lng)) {
      throw new AppError(
        400,
        'INVALID_LOCATION',
        'A localização obtida é inválida. Selecione o ponto no mapa.',
      );
    }

    return {
      lat,
      lng,
      accuracy: result.coords.accuracy,
      source: 'GPS',
    };
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }
}

export async function getReferenceAddress(
  lat: number,
  lng: number,
): Promise<string> {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude: lat,
      longitude: lng,
    });

    const first = results[0];

    if (!first) {
      return 'Endereço de referência indisponível';
    }

    const parts = [
      first.street,
      first.streetNumber,
      first.district,
      first.city,
    ].filter(Boolean);

    return parts.length > 0
      ? parts.join(', ')
      : 'Endereço de referência indisponível';
  } catch {
    return 'Endereço de referência indisponível';
  }
}
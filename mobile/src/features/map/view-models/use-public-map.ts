import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/types';
import * as Location from 'expo-location';
import {
  getPublicOccurrences,
  getCategories,
} from '@/features/occurrences/services/public-occurrences.service';
import type {
  PublicOccurrenceListItem,
  PublicMapFilters,
  CategorySummary,
} from '@/shared/types/api';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'PublicMap'>;

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

const DEFAULT_REGION: MapRegion = {
  latitude: -23.5505,
  longitude: -46.6333,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

const DEBOUNCE_MS = 500;

export function usePublicMapViewModel() {
  const navigation = useNavigation<NavigationProp>();

  const [region, setRegion] = useState<MapRegion>(DEFAULT_REGION);
  const [bbox, setBbox] = useState<PublicMapFilters['bbox']>();
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [occurrences, setOccurrences] = useState<PublicOccurrenceListItem[]>([]);
  const [selectedPin, setSelectedPin] = useState<PublicOccurrenceListItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationPermission, setLocationPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carregar categorias uma vez
  useEffect(() => {
    let cancelled = false;
    setIsLoadingCategories(true);
    getCategories()
      .then((cats) => {
        if (!cancelled) setCategories(cats);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCategories(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Buscar ocorrências quando bbox/categoria mudam (com debounce)
  useEffect(() => {
    if (!bbox) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await getPublicOccurrences({ categoryId, bbox });
        // Defensivo: só CONFIRMED/IN_SERVICE (API já filtra, mas garantimos)
        const filtered = res.data.filter(
          (o) => o.status === 'CONFIRMED' || o.status === 'IN_SERVICE',
        );
        setOccurrences(filtered);
      } catch {
        setError('Não foi possível carregar as ocorrências. Tente novamente.');
        setOccurrences([]);
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [bbox, categoryId]);

  const onRegionChangeComplete = useCallback((newRegion: MapRegion) => {
    setRegion(newRegion);
    const latDelta = newRegion.latitudeDelta / 2;
    const lngDelta = newRegion.longitudeDelta / 2;
    setBbox({
      minLat: newRegion.latitude - latDelta,
      maxLat: newRegion.latitude + latDelta,
      minLng: newRegion.longitude - lngDelta,
      maxLng: newRegion.longitude + lngDelta,
    });
  }, []);

  const requestLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationPermission('denied');
        return;
      }
      setLocationPermission('granted');
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const newRegion: MapRegion = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      setRegion(newRegion);
      // Disparar mudança de bbox
      onRegionChangeComplete(newRegion);
    } catch {
      setLocationPermission('denied');
    }
  }, [onRegionChangeComplete]);

  const selectPin = useCallback((pin: PublicOccurrenceListItem | null) => {
    setSelectedPin(pin);
  }, []);

  const clearFilters = useCallback(() => {
    setCategoryId(undefined);
  }, []);

  return {
    region,
    bbox,
    occurrences,
    selectedPin,
    categoryId,
    categories,
    isLoading,
    isLoadingCategories,
    error,
    locationPermission,
    setCategoryId,
    onRegionChangeComplete,
    requestLocation,
    selectPin,
    clearFilters,
  };
}
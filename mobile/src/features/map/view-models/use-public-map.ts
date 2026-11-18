import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/types';
import * as Location from 'expo-location';
import {
  getPublicOccurrences,
  getCategories,
} from '@/features/occurrences/services/public-occurrences.service';
import type { RegionChangeEvent } from '@/features/map/components/osm-map-view';
import type {
  PublicOccurrenceListItem,
  PublicMapFilters,
  CategorySummary,
} from '@/shared/types/api';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'PublicMap'>;

const DEFAULT_CENTER: [number, number] = [-46.6333, -23.5505]; // [lng, lat]
const DEFAULT_ZOOM = 12;
const DEBOUNCE_MS = 500;

export function usePublicMapViewModel() {
  const navigation = useNavigation<NavigationProp>();
  void navigation;

  const [centerCoordinate, setCenterCoordinate] = useState<[number, number]>(DEFAULT_CENTER);
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);
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

    const loadTimer = setTimeout(() => {
      void getCategories()
        .then((loadedCategories) => {
          if (!cancelled) {
            setCategories(loadedCategories);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setCategories([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsLoadingCategories(false);
          }
        });
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(loadTimer);
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

  // Handler do MapLibre (v11): payload vem em event.nativeEvent.properties
  const onRegionDidChange = useCallback((event: RegionChangeEvent) => {
    const { visibleBounds, zoomLevel: z, center } = event.nativeEvent.properties;
    const [eastLng, northLat, westLng, southLat] = visibleBounds;

    setCenterCoordinate(center);
    setZoomLevel(z);
    setBbox({
      minLat: southLat,
      maxLat: northLat,
      minLng: westLng,
      maxLng: eastLng,
    });
  }, []);

  // Compatibilidade com testes existentes (assinatura antiga)
  // Será removida quando os testes forem migrados para a nova API
  const onRegionChangeComplete = useCallback(
    (region: {
      latitude: number;
      longitude: number;
      latitudeDelta: number;
      longitudeDelta: number;
    }) => {
      const latDelta = region.latitudeDelta / 2;
      const lngDelta = region.longitudeDelta / 2;
      setCenterCoordinate([region.longitude, region.latitude]);
      setBbox({
        minLat: region.latitude - latDelta,
        maxLat: region.latitude + latDelta,
        minLng: region.longitude - lngDelta,
        maxLng: region.longitude + lngDelta,
      });
    },
    [],
  );

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

      setCenterCoordinate([pos.coords.longitude, pos.coords.latitude]);
      setZoomLevel(14);

      const delta = 0.01;
      setBbox({
        minLat: pos.coords.latitude - delta,
        maxLat: pos.coords.latitude + delta,
        minLng: pos.coords.longitude - delta,
        maxLng: pos.coords.longitude + delta,
      });
    } catch {
      setLocationPermission('denied');
    }
  }, []);

  const selectPin = useCallback((pin: PublicOccurrenceListItem | null) => {
    setSelectedPin(pin);
  }, []);

  const clearFilters = useCallback(() => {
    setCategoryId(undefined);
  }, []);

  return {
    centerCoordinate,
    zoomLevel,
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
    onRegionDidChange,
    onRegionChangeComplete, // legado (compat com testes)
    requestLocation,
    selectPin,
    clearFilters,
  };
}
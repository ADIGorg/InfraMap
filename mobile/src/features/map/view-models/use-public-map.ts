import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import * as Location from 'expo-location';

import {
  getCategories,
  getPublicOccurrences,
} from '@/features/occurrences/services/public-occurrences.service';
import type { RegionChangeEvent } from '@/features/map/components/osm-map-view';
import type {
  CategorySummary,
  PublicMapFilters,
  PublicOccurrenceListItem,
} from '@/shared/types/api';

const DEFAULT_CENTER: [number, number] = [
  -38.9663,
  -12.2664,
];

const DEFAULT_ZOOM = 13;
const LOCATION_ZOOM = 15;
const DEBOUNCE_MS = 500;
const INITIAL_DELTA = 0.05;
const LOCATION_DELTA = 0.015;

type LocationPermissionState =
  | 'unknown'
  | 'granted'
  | 'denied';

function createBoundingBox(
  longitude: number,
  latitude: number,
  delta: number,
): NonNullable<PublicMapFilters['bbox']> {
  return {
    minLat: latitude - delta,
    maxLat: latitude + delta,
    minLng: longitude - delta,
    maxLng: longitude + delta,
  };
}

export function usePublicMapViewModel() {
  const [centerCoordinate, setCenterCoordinate] =
    useState<[number, number]>(DEFAULT_CENTER);

  const [zoomLevel, setZoomLevel] =
    useState(DEFAULT_ZOOM);

  const [bbox, setBbox] =
    useState<PublicMapFilters['bbox']>(() =>
      createBoundingBox(
        DEFAULT_CENTER[0],
        DEFAULT_CENTER[1],
        INITIAL_DELTA,
      ),
    );

  const [categoryId, setCategoryId] =
    useState<string | undefined>();

  const [categories, setCategories] =
    useState<CategorySummary[]>([]);

  const [occurrences, setOccurrences] =
    useState<PublicOccurrenceListItem[]>([]);

  const [selectedPin, setSelectedPin] =
    useState<PublicOccurrenceListItem | null>(
      null,
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    isLoadingCategories,
    setIsLoadingCategories,
  ] = useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [
    locationPermission,
    setLocationPermission,
  ] = useState<LocationPermissionState>(
    'unknown',
  );

  const debounceRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

  const occurrenceRequestRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const loadTimer = setTimeout(() => {
      void getCategories()
        .then((loadedCategories) => {
          if (cancelled) {
            return;
          }

          setCategories(
            Array.isArray(loadedCategories)
              ? loadedCategories
              : [],
          );
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

  const requestLocation = useCallback(
    async () => {
      try {
        const permission =
          await Location.requestForegroundPermissionsAsync();

        if (permission.status !== 'granted') {
          setLocationPermission('denied');
          return;
        }

        setLocationPermission('granted');

        const position =
          await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });

        const longitude =
          position.coords.longitude;

        const latitude =
          position.coords.latitude;

        setCenterCoordinate([
          longitude,
          latitude,
        ]);

        setZoomLevel(LOCATION_ZOOM);

        setBbox(
          createBoundingBox(
            longitude,
            latitude,
            LOCATION_DELTA,
          ),
        );
      } catch {
        setLocationPermission('denied');
      }
    },
    [],
  );

  /*
   * Solicita a localização uma vez ao abrir o mapa.
   * O timer evita atualização síncrona dentro do efeito
   * segundo as regras do React Compiler.
   */
  useEffect(() => {
    const locationTimer = setTimeout(() => {
      void requestLocation();
    }, 0);

    return () => {
      clearTimeout(locationTimer);
    };
  }, [requestLocation]);

  useEffect(() => {
    if (!bbox) {
      return undefined;
    }

    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }

    const requestId =
      occurrenceRequestRef.current + 1;

    occurrenceRequestRef.current =
      requestId;

    debounceRef.current = setTimeout(
      async () => {
        setIsLoading(true);
        setError(null);

        try {
          const response =
            await getPublicOccurrences({
              categoryId,
              bbox,
            });

          if (
            requestId !==
            occurrenceRequestRef.current
          ) {
            return;
          }

          const data = Array.isArray(
            response.data,
          )
            ? response.data
            : [];

          setOccurrences(
            data.filter(
              (occurrence) =>
                occurrence.status ===
                  'CONFIRMED' ||
                occurrence.status ===
                  'IN_SERVICE',
            ),
          );
        } catch {
          if (
            requestId !==
            occurrenceRequestRef.current
          ) {
            return;
          }

          setError(
            'Não foi possível carregar as ocorrências. Tente novamente.',
          );

          setOccurrences([]);
        } finally {
          if (
            requestId ===
            occurrenceRequestRef.current
          ) {
            setIsLoading(false);
          }
        }
      },
      DEBOUNCE_MS,
    );

    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [bbox, categoryId]);

  const onRegionDidChange = useCallback(
    (event: RegionChangeEvent) => {
      const { bounds } = event.nativeEvent;

      if (
        !Array.isArray(bounds) ||
        bounds.length !== 4
      ) {
        return;
      }

      const [
        westLng,
        southLat,
        eastLng,
        northLat,
      ] = bounds;

      if (
        !Number.isFinite(westLng) ||
        !Number.isFinite(southLat) ||
        !Number.isFinite(eastLng) ||
        !Number.isFinite(northLat)
      ) {
        return;
      }

      /*
       * Não atualize centerCoordinate nem zoomLevel
       * neste callback.
       *
       * O usuário já moveu o mapa nativamente.
       * Atualizar a Camera novamente criaria um ciclo
       * controlado e animações sucessivas.
       */
      setBbox({
        minLat: southLat,
        maxLat: northLat,
        minLng: westLng,
        maxLng: eastLng,
      });
    },
    [],
  );

  const onRegionChangeComplete =
    useCallback(
      (region: {
        latitude: number;
        longitude: number;
        latitudeDelta: number;
        longitudeDelta: number;
      }) => {
        const latitudeDelta =
          region.latitudeDelta / 2;

        const longitudeDelta =
          region.longitudeDelta / 2;

        setBbox({
          minLat:
            region.latitude - latitudeDelta,
          maxLat:
            region.latitude + latitudeDelta,
          minLng:
            region.longitude - longitudeDelta,
          maxLng:
            region.longitude + longitudeDelta,
        });
      },
      [],
    );

  const selectPin = useCallback(
    (
      pin:
        | PublicOccurrenceListItem
        | null,
    ) => {
      setSelectedPin(pin);
    },
    [],
  );

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
    onRegionChangeComplete,
    requestLocation,
    selectPin,
    clearFilters,
  };
}
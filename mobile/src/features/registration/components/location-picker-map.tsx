
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Linking,
  type NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  Camera,
  Map,
  type CameraRef,
  type PressEvent,
  type ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native';

import { Feather } from '@expo/vector-icons';
import { validateCoordinates } from '@/infrastructure/device/location.service';

import {
  colors,
  radius,
  spacing,
  typography,
} from '@/shared/theme';

const OSM_VECTOR_STYLE_URL =
  'https://tiles.openfreemap.org/styles/liberty';

interface Coordinate {
  lat: number;
  lng: number;
}

interface Props {
  coordinate: Coordinate;
  onChange: (coordinate: Coordinate) => void;
}

export function LocationPickerMap({
  coordinate,
  onChange,
}: Props) {
  const { lat, lng } = coordinate;
  const [initialViewState] = useState(() => ({
    center: [lng, lat] as [number, number],
    zoom: 16,
  }));
  const camera = useRef<CameraRef>(null);
  const lastCenter = useRef(initialViewState.center);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapReady || !camera.current) return;
    const [currentLng, currentLat] = lastCenter.current;
    if (lng === currentLng && lat === currentLat) return;

    camera.current.jumpTo({ center: [lng, lat] });
    lastCenter.current = [lng, lat];
  }, [lat, lng, mapReady]);

  const handleRegionDidChange = useCallback(
    ({ nativeEvent }: NativeSyntheticEvent<ViewStateChangeEvent>) => {
      if (!nativeEvent.userInteraction) return;
      const [nextLng, nextLat] = nativeEvent.center;
      if (!validateCoordinates(nextLat, nextLng)) return;

      // The gesture has already moved the native camera.
      lastCenter.current = [nextLng, nextLat];
      if (nextLat === lat && nextLng === lng) return;
      onChange({ lat: nextLat, lng: nextLng });
    },
    [lat, lng, onChange],
  );

  const handleMapPress = useCallback(
    ({ nativeEvent }: NativeSyntheticEvent<PressEvent>) => {
      const [nextLng, nextLat] = nativeEvent.lngLat;
      if (validateCoordinates(nextLat, nextLng)) onChange({ lat: nextLat, lng: nextLng });
    },
    [onChange],
  );

  const handleOpenAttribution = useCallback(() => {
    void Linking.openURL(
      'https://www.openstreetmap.org/copyright',
    );
  }, []);


  return (
    <View>
      <Text style={styles.instruction}>
        Arraste o mapa para posicionar o pino no local exato
      </Text>

      <View
        style={styles.container}
        testID="location-picker-map"
      >
        <Map
          style={styles.map}
          mapStyle={OSM_VECTOR_STYLE_URL}
          logo={false}
          attribution={false}
          compass
          dragPan
          touchZoom
          doubleTapZoom
          touchRotate={false}
          touchPitch={false}
          onPress={handleMapPress}
          onRegionDidChange={handleRegionDidChange}
          onDidFinishLoadingMap={() => setMapReady(true)}
        >
          <Camera
            ref={camera}
            initialViewState={initialViewState}
          />
        </Map>

        <View
          style={styles.centerMarker}
          pointerEvents="none"
        >
          <View style={styles.pin}>
            <Feather
              name="map-pin"
              size={24}
              color={colors.text.inverse}
            />
          </View>

          <View style={styles.pinShadow} />
        </View>

        <View
          style={styles.attribution}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            onPress={handleOpenAttribution}
            accessibilityRole="link"
            accessibilityLabel="Direitos autorais do OpenStreetMap"
          >
            <Text style={styles.attributionText}>
              © OpenStreetMap contributors
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.coordinateCard}>
        <Feather
          name="crosshair"
          size={16}
          color={colors.brand.primary}
        />

        <Text style={styles.coordinateText}>
          {coordinate.lat.toFixed(6)},{' '}
          {coordinate.lng.toFixed(6)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  instruction: {
    marginBottom: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  container: {
    height: 300,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surface.page,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },

  map: {
    flex: 1,
  },

  centerMarker: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 48,
    height: 60,
    marginLeft: -24,
    marginTop: -48,
    alignItems: 'center',
  },

  pin: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.status.REJECTED,
    borderWidth: 3,
    borderColor: colors.text.inverse,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.28,
    shadowRadius: 4,
    elevation: 6,
  },

  pinShadow: {
    width: 14,
    height: 6,
    marginTop: 3,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },

  attribution: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },

  attributionText: {
    fontSize: 9,
    color: colors.text.secondary,
  },

  coordinateCard: {
    marginTop: spacing.sm,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },

  coordinateText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
  },
});

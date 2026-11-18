
import React from 'react';
import {
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  Camera,
  Map,
} from '@maplibre/maplibre-react-native';

import { colors } from '@/shared/theme';

const OSM_VECTOR_STYLE_URL =
  'https://tiles.openfreemap.org/styles/liberty';

export type RegionChangeEvent = {
  nativeEvent: {
    center: [number, number];
    zoom: number;
    bounds: [number, number, number, number];
    bearing: number;
    pitch: number;
    animated: boolean;
    userInteraction: boolean;
  };
};

interface OSMMapViewProps {
  centerCoordinate: [number, number];
  zoomLevel?: number;
  onRegionDidChange?: (event: RegionChangeEvent) => void;
  children?: React.ReactNode;
}

export function OSMMapView({
  centerCoordinate,
  zoomLevel = 12,
  onRegionDidChange,
  children,
}: OSMMapViewProps) {
  const handleOpenAttribution = () => {
    void Linking.openURL(
      'https://www.openstreetmap.org/copyright',
    );
  };

  return (
    <View
      style={styles.container}
      testID="osm-map-view"
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
        touchRotate
        touchPitch={false}
        onRegionDidChange={onRegionDidChange as never}
      >
        <Camera
          center={centerCoordinate}
          zoom={zoomLevel}
          duration={500}
          easing="ease"
        />

        {children}
      </Map>

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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  map: {
    flex: 1,
  },

  attribution: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },

  attributionText: {
    fontSize: 10,
    color: colors.text.secondary,
  },
});

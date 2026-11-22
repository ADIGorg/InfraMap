import React from 'react';
import { StyleSheet, View, Text, Linking, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  Map,
  Camera,
  RasterSource,
  Layer,
  Marker,
} from '@maplibre/maplibre-react-native';
import type { GeoPoint } from '@/shared/types/api';
import { colors, radius } from '@/shared/theme';

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

interface MiniMapProps {
  location: GeoPoint;
  zoomLevel?: number;
}

export function MiniMap({ location, zoomLevel = 15 }: MiniMapProps) {
  const { lat, lng } = location;

  return (
    <View style={styles.container} testID="mini-map">
      <Map
        style={styles.map}
        mapStyle=""
        logo={false}
        attribution={false}
        compass={false}
        touchZoom
        touchRotate={false}
        touchPitch={false}
      >
        <Camera
          center={[lng, lat]}
          zoom={zoomLevel}
          duration={0}
        />
        <RasterSource
          id="osm-tiles-mini"
          tiles={[OSM_TILE_URL]}
          tileSize={256}
        >
          <Layer type="raster" id="osm-layer-mini" source="osm-tiles-mini" />
        </RasterSource>
        <Marker id="pin" lngLat={[lng, lat]}>
          <View style={styles.pin}>
            <Feather name="map-pin" size={16} color={colors.text.inverse} />
          </View>
        </Marker>
      </Map>

      <View style={styles.attribution} pointerEvents="box-none">
        <TouchableOpacity
          onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')}
          accessibilityRole="link"
          accessibilityLabel="Direitos autorais do OpenStreetMap"
        >
          <Text style={styles.attributionText}>© OpenStreetMap</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 160,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface.page,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  map: { flex: 1 },
  pin: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primary,
    borderWidth: 2,
    borderColor: colors.text.inverse,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attribution: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  attributionText: { fontSize: 9, color: colors.text.secondary },
});

import React from 'react';
import { StyleSheet, View, Text, Linking, TouchableOpacity } from 'react-native';
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
          <View style={styles.pin} />
        </Marker>
      </Map>

      <View style={styles.attribution} pointerEvents="box-none">
        <TouchableOpacity
          onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')}
        >
          <Text style={styles.attributionText}>© OSM</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface.page,
  },
  map: { flex: 1 },
  pin: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: colors.status.REJECTED,
    borderWidth: 2,
    borderColor: colors.text.inverse,
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
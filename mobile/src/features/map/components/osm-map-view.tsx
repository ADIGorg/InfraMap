import React from 'react';
import { StyleSheet, View, Text, Linking, TouchableOpacity } from 'react-native';
import {
  Map,
  Camera,
  RasterSource,
  Layer,
} from '@maplibre/maplibre-react-native';
import { colors } from '@/shared/theme';

// ⚠️ Servidor público do OSM 
// Para produção, use MapTiler, Stadia Maps ou self-hosted.
const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export interface RegionChangeEvent {
  nativeEvent: {
    properties: {
      // Ordem: [East, North, West, South] — confirmado na doc do MapLibre
      visibleBounds: [number, number, number, number];
      zoomLevel: number;
      center: [number, number]; // [lng, lat]
    };
  };
}

interface OSMMapViewProps {
  centerCoordinate: [number, number]; // [lng, lat]
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
  return (
    <View style={styles.container} testID="osm-map-view">
      <Map
        style={styles.map}
        mapStyle=""                       // vazio = nenhum estilo vetorial base
        logo={false}
        attribution={false}
        compass
        touchZoom
        touchRotate
        touchPitch={false}
        onRegionDidChange={onRegionDidChange as any}
      >
        <Camera
          center={centerCoordinate}
          zoom={zoomLevel}
          duration={300}
          easing="fly"
        />
        <RasterSource
          id="osm-tiles"
          tiles={[OSM_TILE_URL]}
          tileSize={256}
        >
          <Layer type="raster" id="osm-layer" source="osm-tiles" />
        </RasterSource>
        {children}
      </Map>

      {/* Atribuição OSM — obrigatória pela licença ODbL */}
      <View style={styles.attribution} pointerEvents="box-none">
        <TouchableOpacity
          onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')}
          accessibilityRole="link"
        >
          <Text style={styles.attributionText}>© OpenStreetMap contributors</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  attribution: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  attributionText: { fontSize: 10, color: colors.text.secondary },
});
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Camera, Layer, Map, Marker, RasterSource } from '@maplibre/maplibre-react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/shared/theme';

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

interface Props {
  coordinate: { lat: number; lng: number };
  onChange: (coordinate: { lat: number; lng: number }) => void;
}

export function LocationPickerMap({ coordinate, onChange }: Props) {
  return (
    <View style={styles.container} testID="location-picker-map">
      <Map
        style={styles.map}
        mapStyle=""
        logo={false}
        attribution={false}
        touchPitch={false}
        onPress={(event: any) => {
          const [lng, lat] = event.nativeEvent?.geometry?.coordinates ?? [];
          if (typeof lat === 'number' && typeof lng === 'number') {
            onChange({ lat, lng });
          }
        }}
      >
        <Camera center={[coordinate.lng, coordinate.lat]} zoom={15} duration={250} />
        <RasterSource id="osm-location" tiles={[OSM_TILE_URL]} tileSize={256}>
          <Layer type="raster" id="osm-location-layer" source="osm-location" />
        </RasterSource>
        <Marker id="selected-location" lngLat={[coordinate.lng, coordinate.lat]}>
          <View style={styles.pin}>
            <Feather name="map-pin" size={20} color={colors.text.inverse} />
          </View>
        </Marker>
      </Map>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 280, borderRadius: radius.xl, overflow: 'hidden' },
  map: { flex: 1 },
  pin: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.status.REJECTED, borderWidth: 2, borderColor: colors.text.inverse, alignItems: 'center', justifyContent: 'center' },
});

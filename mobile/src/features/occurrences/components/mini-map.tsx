import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Feather } from '@expo/vector-icons';
import type { GeoPoint } from '@/shared/types/api';
import { colors, radius } from '@/shared/theme';

interface Props {
  location: GeoPoint;
}

/**
 * Mini-mapa estático. Mostra apenas a coordenada aproximada recebida
 * da API (RN022), sem qualquer enriquecimento ou geocoding.
 */
export function MiniMap({ location }: Props) {
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: location.lat,
          longitude: location.lng,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        }}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        liteMode
      >
        <Marker coordinate={{ latitude: location.lat, longitude: location.lng }}>
          <View style={styles.pin}>
            <Feather name="map-pin" size={14} color="#fff" />
          </View>
        </Marker>
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 160,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  map: { flex: 1 },
  pin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.status.CONFIRMED,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
});
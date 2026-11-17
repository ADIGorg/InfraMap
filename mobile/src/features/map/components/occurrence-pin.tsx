import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { Feather } from '@expo/vector-icons';
import type { PublicOccurrenceListItem } from '@/shared/types/api';
import { colors } from '@/shared/theme';

interface Props {
  occurrence: PublicOccurrenceListItem;
  onPress: (occurrence: PublicOccurrenceListItem) => void;
}

const PIN_COLORS: Record<PublicOccurrenceListItem['status'], string> = {
  CONFIRMED: colors.status.CONFIRMED,
  IN_SERVICE: colors.status.IN_SERVICE,
};

export function OccurrencePin({ occurrence, onPress }: Props) {
  return (
    <Marker
      coordinate={{
        latitude: occurrence.location.lat,
        longitude: occurrence.location.lng,
      }}
      onPress={() => onPress(occurrence)}
      tracksViewChanges={false}
    >
      <View style={[styles.pin, { backgroundColor: PIN_COLORS[occurrence.status] }]}>
        <Feather name="map-pin" size={14} color="#fff" />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
});
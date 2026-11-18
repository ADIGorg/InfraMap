import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from '@maplibre/maplibre-react-native';
import { Feather } from '@expo/vector-icons';
import type { PublicOccurrenceListItem } from '@/shared/types/api';
import { colors, radius } from '@/shared/theme';

interface OccurrencePinProps {
  occurrence: PublicOccurrenceListItem;
  onPress: (occurrence: PublicOccurrenceListItem) => void;
}

export function OccurrencePin({ occurrence, onPress }: OccurrencePinProps) {
  const pinColor =
    occurrence.status === 'CONFIRMED'
      ? colors.status.CONFIRMED
      : colors.status.IN_SERVICE;

  return (
    <Marker
      id={occurrence.id}
      lngLat={[occurrence.location.lng, occurrence.location.lat]}
      onPress={() => onPress(occurrence)}
    >
      <View style={[styles.pin, { backgroundColor: pinColor }]}>
        <Feather name="alert-circle" size={14} color={colors.text.inverse} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.text.inverse,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
});
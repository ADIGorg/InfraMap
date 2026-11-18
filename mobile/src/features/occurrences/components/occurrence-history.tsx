import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { HistoryEvent } from '@/shared/types/api';
import { OccurrenceHistoryItem } from './occurrence-history-item';
import { colors, radius, spacing, typography } from '@/shared/theme';

export function OccurrenceHistory({ events }: { events: HistoryEvent[] }) {
  return (
    <View style={styles.card}>
      {events.length === 0 ? (
        <Text style={styles.empty}>Nenhuma atualização disponível.</Text>
      ) : (
        events.map((event, index) => (
          <OccurrenceHistoryItem
            key={event.id}
            event={event}
            isLast={index === events.length - 1}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing.base,
  },
  empty: { textAlign: 'center', fontSize: typography.sizes.sm, color: colors.text.secondary },
});

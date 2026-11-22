import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { OccurrenceStatus } from '@/shared/types/api';
import { colors, typography, spacing, radius } from '@/shared/theme';

const STATUS_CONFIG: Record<OccurrenceStatus, { label: string; color: string }> = {
  RECEIVED: { label: 'Recebido', color: colors.status.RECEIVED },
  UNDER_ANALYSIS: { label: 'Em análise', color: colors.status.UNDER_ANALYSIS },
  CONFIRMED: { label: 'Confirmado', color: colors.status.CONFIRMED },
  IN_SERVICE: { label: 'Em atendimento', color: colors.status.IN_SERVICE },
  RESOLVED: { label: 'Resolvido', color: colors.status.RESOLVED },
  REJECTED: { label: 'Rejeitado', color: colors.status.REJECTED },
};

export function StatusBadge({ status }: { status: OccurrenceStatus }) {
  const { label, color } = STATUS_CONFIG[status];
  return (
    <View
      style={[styles.badge, { backgroundColor: `${color}20` }]}
      accessibilityLabel={`Status: ${label}`}
    >
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  text: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
});

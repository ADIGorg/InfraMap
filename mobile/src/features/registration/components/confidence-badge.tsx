import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/shared/theme';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export function confidenceLevel(confidence: number | null): ConfidenceLevel {
  if (confidence === null) return 'UNKNOWN';
  if (confidence >= 0.85) return 'HIGH';
  if (confidence >= 0.7) return 'MEDIUM';
  return 'LOW';
}

export function ConfidenceBadge({ confidence }: { confidence: number | null }) {
  const level = confidenceLevel(confidence);
  const percentage = confidence === null ? null : Math.round(confidence * 100);
  const config = {
    HIGH: { background: '#EAFAF1', foreground: colors.status.RESOLVED, suffix: '' },
    MEDIUM: { background: '#FEF9E7', foreground: '#9A7D0A', suffix: ' (atenção)' },
    LOW: { background: '#FDEDEC', foreground: colors.status.REJECTED, suffix: ' (baixa confiança)' },
    UNKNOWN: { background: colors.surface.page, foreground: colors.text.secondary, suffix: '' },
  }[level];

  return (
    <View style={[styles.badge, { backgroundColor: config.background }]}>
      <Text style={[styles.text, { color: config.foreground }]}>
        {percentage === null ? 'IA: confiança indisponível' : `IA: ${percentage}%${config.suffix}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full },
  text: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold },
});

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { MyOccurrenceListItem } from '@/shared/types/api';
import { StatusBadge } from './status-badge';
import { formatDate } from '@/shared/utils/format-date';
import { colors, typography, spacing, radius } from '@/shared/theme';

interface Props {
  occurrence: MyOccurrenceListItem;
  onPress: (id: string) => void;
}

const CATEGORY_ICON: Record<string, keyof typeof Feather.glyphMap> = {
  CAT01: 'droplet',
  CAT02: 'zap',
  CAT03: 'tool',
  CAT04: 'trash-2',
  CAT05: 'navigation',
  CAT06: 'users',
  CAT07: 'alert-circle',
};

export function OccurrenceCard({ occurrence, onPress }: Props) {
  const iconName = CATEGORY_ICON[occurrence.category.code] ?? 'map-pin';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(occurrence.id)}
      accessibilityRole="button"
      accessibilityLabel={`${occurrence.category.name}, ${occurrence.description}, ${occurrence.status}`}
    >
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Feather name={iconName} size={18} color={colors.brand.primary} />
        </View>
        <Text style={styles.category} numberOfLines={2}>
          {occurrence.category.name}
        </Text>
      </View>

      <View style={styles.metadata}>
        <Text style={styles.date}>Criado em: {formatDate(occurrence.createdAt)}</Text>
        <StatusBadge status={occurrence.status} />
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {occurrence.description}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.default,
    padding: spacing.base,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface.noticeInfo,
    justifyContent: 'center',
    alignItems: 'center',
  },
  category: {
    flex: 1,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  date: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  description: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});

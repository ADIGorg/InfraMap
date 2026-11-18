import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { DataSource } from '@/shared/types/registration';
import { colors, radius, spacing, typography } from '@/shared/theme';

const SOURCE_LABEL: Record<DataSource, string> = { AI_CONFIRMED: 'IA', AI_EDITED: 'IA editada', USER_MANUAL: 'Manual' };

export function ReviewCategoryCard({ categoryName, source, onEdit }: { categoryName: string; source: DataSource; onEdit: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Categoria</Text>
        <TouchableOpacity onPress={onEdit} accessibilityRole="button" accessibilityLabel="Editar categoria"><Text style={styles.edit}>Editar</Text></TouchableOpacity>
      </View>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{categoryName || 'Categoria não selecionada'}</Text>
        <View style={[styles.badge, source === 'USER_MANUAL' && styles.manualBadge]}><Text style={[styles.badgeText, source === 'USER_MANUAL' && styles.manualText]}>{SOURCE_LABEL[source]}</Text></View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface.card, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border.subtle, padding: spacing.base },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold, color: colors.text.primary },
  edit: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.brand.primary },
  valueRow: { marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  value: { flex: 1, fontSize: typography.sizes.base, color: colors.text.primary },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: '#E8F8F5' },
  badgeText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold, color: '#148F77' },
  manualBadge: { backgroundColor: colors.surface.page }, manualText: { color: colors.text.secondary },
});

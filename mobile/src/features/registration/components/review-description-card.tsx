import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { DataSource } from '@/shared/types/registration';
import { colors, radius, spacing, typography } from '@/shared/theme';

const SOURCE_LABEL: Record<DataSource, string> = { AI_CONFIRMED: 'Sugerido pela IA', AI_EDITED: 'Sugestão editada', USER_MANUAL: 'Texto manual' };

interface Props { value: string; source: DataSource; error: string | null; isEditing: boolean; onChange: (value: string) => void; onToggleEdit: () => void }
export function ReviewDescriptionCard({ value, source, error, isEditing, onChange, onToggleEdit }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}><Text style={styles.title}>Descrição</Text><TouchableOpacity onPress={onToggleEdit} accessibilityRole="button"><Text style={styles.edit}>{isEditing ? 'Concluir' : 'Editar'}</Text></TouchableOpacity></View>
      <Text style={[styles.source, source === 'USER_MANUAL' && styles.manualSource]}>{SOURCE_LABEL[source]}</Text>
      {isEditing ? <><TextInput value={value} onChangeText={onChange} style={[styles.input, error && styles.inputError]} multiline maxLength={500} textAlignVertical="top" placeholder="Descreva o problema" placeholderTextColor={colors.text.secondary} accessibilityLabel="Descrição final da ocorrência" /><Text style={styles.counter}>{value.length} / 500</Text></> : <Text style={styles.description}>{value || 'Descrição não informada'}</Text>}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface.card, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border.subtle, padding: spacing.base },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, title: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold, color: colors.text.primary },
  edit: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.brand.primary }, source: { marginTop: spacing.sm, fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold, color: colors.brand.secondary }, manualSource: { color: colors.text.secondary },
  description: { marginTop: spacing.sm, fontSize: typography.sizes.base, lineHeight: 22, color: colors.text.secondary }, input: { marginTop: spacing.sm, minHeight: 120, borderWidth: 1, borderColor: colors.border.default, borderRadius: radius.lg, padding: spacing.md, fontSize: typography.sizes.base, lineHeight: 22, color: colors.text.primary }, inputError: { borderColor: colors.status.REJECTED }, counter: { marginTop: spacing.xs, alignSelf: 'flex-end', fontSize: typography.sizes.xs, color: colors.text.secondary }, error: { marginTop: spacing.xs, fontSize: typography.sizes.xs, color: colors.status.REJECTED },
});

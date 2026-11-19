import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { PhotoVisibility } from '@/shared/types/registration';
import { colors, radius, spacing, typography } from '@/shared/theme';

interface Props {
  value: PhotoVisibility;
  onChange: (value: Exclude<PhotoVisibility, null>) => void;
}

export function PhotoVisibilityControl({ value, onChange }: Props) {
  return (
    <View style={styles.card} accessibilityRole="radiogroup">
      <View style={styles.heading}>
        <Feather name="shield" size={20} color={colors.brand.primary} />
        <View style={styles.headingText}>
          <Text style={styles.title}>Privacidade das evidências</Text>
          <Text style={styles.description}>
            Escolha como as fotos poderão ser usadas antes de abrir a câmera.
          </Text>
        </View>
      </View>
      <Option
        selected={value === 'PUBLIC'}
        label="Autorizar exibição pública"
        description="As fotos poderão aparecer no mapa público."
        onPress={() => onChange('PUBLIC')}
      />
      <Option
        selected={value === 'PRIVATE'}
        label="Manter fotos privadas"
        description="As fotos ficam disponíveis apenas para você e para a equipe responsável."
        onPress={() => onChange('PRIVATE')}
      />
      <Text style={styles.blocker}>
        Sua escolha será registrada junto às fotos. Fotos públicas poderão aparecer no detalhe público da ocorrência; fotos privadas ficarão disponíveis somente para você e para a administração.
      </Text>
    </View>
  );
}

function Option({ selected, label, description, onPress }: { selected: boolean; label: string; description: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.option, selected && styles.optionSelected]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
      <View style={styles.optionText}>
        <Text style={styles.optionLabel}>{label}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface.noticeInfo, borderRadius: radius.lg, padding: spacing.base, gap: spacing.sm },
  heading: { flexDirection: 'row', gap: spacing.sm },
  headingText: { flex: 1 },
  title: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold, color: colors.brand.primary },
  description: { marginTop: spacing.xs, fontSize: typography.sizes.sm, lineHeight: 18, color: colors.text.secondary },
  option: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface.card, borderWidth: 1, borderColor: colors.border.subtle, borderRadius: radius.md, padding: spacing.md },
  optionSelected: { borderColor: colors.brand.primary },
  radio: { width: 20, height: 20, borderRadius: radius.full, borderWidth: 2, borderColor: colors.border.default, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: colors.brand.primary },
  radioDot: { width: 10, height: 10, borderRadius: radius.full, backgroundColor: colors.brand.primary },
  optionText: { flex: 1, marginLeft: spacing.sm },
  optionLabel: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.text.primary },
  optionDescription: { marginTop: 2, fontSize: typography.sizes.xs, lineHeight: 16, color: colors.text.secondary },
  blocker: { fontSize: typography.sizes.xs, lineHeight: 16, color: colors.status.REJECTED },
});

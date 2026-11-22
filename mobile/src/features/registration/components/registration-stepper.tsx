import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/shared/theme';

const STEPS = ['Foto', 'Análise IA', 'Revisão', 'Localização'];

export function RegistrationStepper({ currentStep }: { currentStep: 1 | 2 | 3 | 4 }) {
  return (
    <View style={styles.container} accessibilityLabel={`Etapa ${currentStep} de 4`}>
      {STEPS.map((label, index) => {
        const number = index + 1;
        const active = number === currentStep;
        const completed = number < currentStep;
        return (
          <React.Fragment key={label}>
            <View style={styles.step}>
              <View style={[
                styles.circle,
                completed && styles.completed,
                active && styles.active,
              ]}>
                <Text style={[styles.number, completed && styles.completedNumber]}>{number}</Text>
              </View>
              <Text style={[styles.label, active && styles.activeLabel]}>{label}</Text>
            </View>
            {number < STEPS.length ? (
              <View style={[styles.line, completed && styles.completedLine]} />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.default,
  },
  step: { flex: 3, alignItems: 'center' },
  circle: { width: 34, height: 34, borderRadius: radius.full, backgroundColor: colors.surface.page, alignItems: 'center', justifyContent: 'center' },
  active: { backgroundColor: colors.brand.secondary },
  completed: { backgroundColor: colors.brand.primary },
  number: { color: colors.text.primary, fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  completedNumber: { color: colors.text.inverse },
  label: { marginTop: spacing.xs, fontSize: typography.sizes.xs, color: colors.text.secondary, textAlign: 'center' },
  activeLabel: { color: colors.brand.primary, fontWeight: typography.weights.semibold },
  line: { flex: 1, height: 3, borderRadius: radius.full, marginTop: 16, backgroundColor: colors.border.subtle },
  completedLine: { backgroundColor: colors.brand.primary },
});

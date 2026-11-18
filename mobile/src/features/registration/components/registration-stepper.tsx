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
                <Text style={styles.number}>{number}</Text>
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
  container: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: spacing.base },
  step: { width: 62, alignItems: 'center' },
  circle: { width: 28, height: 28, borderRadius: radius.full, backgroundColor: colors.border.default, alignItems: 'center', justifyContent: 'center' },
  active: { backgroundColor: colors.brand.secondary },
  completed: { backgroundColor: colors.brand.primary },
  number: { color: colors.text.inverse, fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  label: { marginTop: spacing.xs, fontSize: typography.sizes.xs, color: colors.text.secondary, textAlign: 'center' },
  activeLabel: { color: colors.brand.primary, fontWeight: typography.weights.semibold },
  line: { flex: 1, height: 2, marginTop: 13, backgroundColor: colors.border.default },
  completedLine: { backgroundColor: colors.brand.primary },
});

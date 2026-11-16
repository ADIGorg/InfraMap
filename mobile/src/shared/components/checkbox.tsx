import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/shared/theme';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
  error?: string;
}

export function Checkbox({ checked, onChange, children, error }: CheckboxProps) {
  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={styles.container}
        onPress={() => onChange(!checked)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        activeOpacity={0.7}
      >
        <View style={[styles.box, checked && styles.boxChecked, error && styles.boxError]}>
          {checked && <Feather name="check" size={14} color={colors.text.inverse} />}
        </View>
        <View style={styles.labelWrapper}>{children}</View>
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.base },
  container: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  box: {
    width: 20, height: 20, borderRadius: radius.sm - 2, borderWidth: 1,
    borderColor: colors.border.default, backgroundColor: colors.surface.card,
    justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm,
  },
  boxChecked: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  boxError: { borderColor: colors.status.REJECTED },
  labelWrapper: { flex: 1 },
  errorText: {
    fontSize: typography.sizes.xs, color: colors.status.REJECTED,
    marginTop: spacing.xs, marginLeft: 28,
  },
});
import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { colors, typography, spacing, radius } from '@/shared/theme';

interface InputFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  rightIcon?: React.ReactNode;
}

export function InputField({ label, error, rightIcon, ...rest }: InputFieldProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, error && styles.inputError]}>
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.text.secondary}
          {...rest}
        />
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.base },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs + 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.base,
    height: 48,
  },
  inputError: { borderColor: colors.status.REJECTED },
  input: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    height: '100%',
  },
  rightIcon: { marginLeft: spacing.sm },
  errorText: {
    fontSize: typography.sizes.xs,
    color: colors.status.REJECTED,
    marginTop: spacing.xs,
  },
});
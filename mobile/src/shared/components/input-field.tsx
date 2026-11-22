import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { colors, typography, spacing, radius } from '@/shared/theme';

interface InputFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  rightIcon?: React.ReactNode;
}

export function InputField({ label, error, rightIcon, onFocus, onBlur, ...rest }: InputFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, focused && styles.inputFocused, error && styles.inputError]}>
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.text.secondary}
          {...rest}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
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
    minHeight: 50,
  },
  inputFocused: { borderColor: colors.brand.primary },
  inputError: { borderColor: colors.status.REJECTED },
  input: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    minHeight: 48,
    paddingVertical: spacing.sm,
  },
  rightIcon: { marginLeft: spacing.sm },
  errorText: {
    fontSize: typography.sizes.xs,
    color: colors.status.REJECTED,
    marginTop: spacing.xs,
  },
});

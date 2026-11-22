import type { ReactNode } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { colors, typography } from '@/shared/theme';

interface ScreenTitleProps {
  children: ReactNode;
  inverse?: boolean;
  style?: StyleProp<TextStyle>;
}

export function ScreenTitle({ children, inverse, style }: ScreenTitleProps) {
  return (
    <Text accessibilityRole="header" style={[styles.title, inverse && styles.inverse, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.brand.primary,
  },
  inverse: { color: colors.text.inverse },
});

import React from 'react';
import { SafeAreaView, StyleSheet, Text } from 'react-native';
import { colors, spacing, typography } from '@/shared/theme';

export function ReviewPlaceholderScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Revisão da ocorrência</Text>
      <Text style={styles.text}>A análise foi confirmada. Esta tela será implementada no próximo ticket.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.surface.page },
  title: { fontSize: typography.sizes['2xl'], fontWeight: typography.weights.bold, color: colors.brand.primary },
  text: { marginTop: spacing.md, fontSize: typography.sizes.base, lineHeight: 22, color: colors.text.secondary },
});

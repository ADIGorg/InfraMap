import React from 'react';
import { SafeAreaView, StyleSheet, Text } from 'react-native';
import { colors, spacing, typography } from '@/shared/theme';

export function AnalysisPlaceholderScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Análise da IA</Text>
      <Text style={styles.text}>As fotos foram enviadas. Esta etapa será implementada no próximo ticket.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.surface.page },
  title: { fontSize: typography.sizes['2xl'], fontWeight: typography.weights.bold, color: colors.brand.primary },
  text: { marginTop: spacing.md, fontSize: typography.sizes.base, lineHeight: 22, color: colors.text.secondary },
});

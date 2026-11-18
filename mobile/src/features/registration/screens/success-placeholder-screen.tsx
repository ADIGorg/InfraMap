import React from 'react';
import { SafeAreaView, StyleSheet, Text } from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NewOccurrenceStackParamList } from '@/navigation/types';
import { colors, spacing, typography } from '@/shared/theme';

export function SuccessPlaceholderScreen() {
  const route = useRoute<RouteProp<NewOccurrenceStackParamList, 'Success'>>();
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Ocorrência registrada</Text>
      <Text style={styles.text}>Protocolo: {route.params.occurrenceId}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.surface.page },
  title: { fontSize: typography.sizes['2xl'], fontWeight: typography.weights.bold, color: colors.brand.primary },
  text: { marginTop: spacing.md, fontSize: typography.sizes.base, color: colors.text.secondary },
});

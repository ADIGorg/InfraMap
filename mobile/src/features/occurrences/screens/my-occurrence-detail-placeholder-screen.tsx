import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { colors, typography, spacing } from '@/shared/theme';

/**
 * Stub de navegação. MOB-UI-11 substituirá pela tela real.
 */
export function MyOccurrenceDetailPlaceholderScreen() {
  const route = useRoute();
  const params = (route.params ?? {}) as { id?: string };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Detalhe da ocorrência</Text>
      <Text style={styles.body}>ID: {params.id ?? '—'}</Text>
      <Text style={styles.note}>
        Tela completa será implementada em MOB-UI-11.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface.page,
    padding: spacing.xl,
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  body: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  note: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
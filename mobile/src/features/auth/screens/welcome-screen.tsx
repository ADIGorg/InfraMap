import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '@/shared/theme';

export function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>InfraMap</Text>
      <Text style={styles.subtitle}>Sua cidade melhor, com sua participação.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface.page, padding: 24 },
  title: { fontSize: typography.sizes['3xl'], fontWeight: typography.weights.extrabold, color: colors.brand.primary },
  subtitle: { fontSize: typography.sizes.base, color: colors.text.secondary, textAlign: 'center', marginTop: 8 }
});
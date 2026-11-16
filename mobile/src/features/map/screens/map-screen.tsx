import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/shared/theme';

export function MapScreen() {
  return (
    <View style={styles.container}>
      <Text>Mapa Público (Em construção)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
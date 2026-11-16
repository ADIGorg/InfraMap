import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/shared/theme';

export function PublicMapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Mapa Público (Deslogado)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface.page },
  text: { fontSize: 18, color: colors.text.primary }
});
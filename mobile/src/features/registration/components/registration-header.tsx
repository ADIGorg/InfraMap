import { StyleSheet, View } from 'react-native';
import { ScreenTitle } from '@/shared/components/screen-title';
import { colors, spacing } from '@/shared/theme';

export function RegistrationHeader() {
  return (
    <View style={styles.header}>
      <ScreenTitle inverse>Nova ocorrência</ScreenTitle>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.base,
  },
});

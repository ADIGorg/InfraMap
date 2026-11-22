import { Feather } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, spacing } from '@/shared/theme';
import { ScreenTitle } from './screen-title';

interface BackHeaderProps {
  title: string;
  onBack: () => void;
  style?: StyleProp<ViewStyle>;
}

export function BackHeader({ title, onBack, style }: BackHeaderProps) {
  return (
    <View style={[styles.header, style]}>
      <TouchableOpacity
        style={styles.button}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
      >
        <Feather name="arrow-left" size={24} color={colors.brand.primary} />
      </TouchableOpacity>
      <ScreenTitle style={styles.title}>{title}</ScreenTitle>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    paddingRight: spacing.base,
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.surface.noticeInfo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1 },
});

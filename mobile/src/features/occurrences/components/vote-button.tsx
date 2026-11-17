import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/shared/theme';

interface Props {
  votesCount: number;
  hasVoted: boolean | null;
  isLoading: boolean;
  onPress: () => void;
}

export function VoteButton({ votesCount, hasVoted, isLoading, onPress }: Props) {
  const isVoted = hasVoted === true;
  const label = isVoted ? 'Votado' : 'Votar';
  const iconName: keyof typeof Feather.glyphMap = 'thumbs-up';

  return (
    <View style={styles.container}>
      <View style={styles.countWrapper}>
        <Text style={styles.count} accessibilityLabel={`${votesCount} votos`}>
          {votesCount}
        </Text>
        <Text style={styles.caption}>Votos de impacto comunitário</Text>
      </View>
      <TouchableOpacity
        style={[styles.button, isVoted && styles.buttonActive]}
        onPress={onPress}
        disabled={isLoading}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: isVoted, disabled: isLoading }}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.brand.primary} size="small" />
        ) : (
          <>
            <Feather
              name={iconName}
              size={18}
              color={isVoted ? colors.text.inverse : colors.brand.primary}
              style={styles.icon}
            />
            <Text style={[styles.label, isVoted && styles.labelActive]}>
              {label}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface.card,
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  countWrapper: { flex: 1 },
  count: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.extrabold,
    color: colors.text.primary,
  },
  caption: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.brand.primary,
    backgroundColor: colors.surface.card,
    minWidth: 100,
    justifyContent: 'center',
  },
  buttonActive: {
    backgroundColor: colors.brand.primary,
  },
  icon: { marginRight: spacing.xs },
  label: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.brand.primary,
  },
  labelActive: { color: colors.text.inverse },
});
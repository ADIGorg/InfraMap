import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppNotification } from '@/shared/types/notifications';
import { colors, radius, spacing, typography } from '@/shared/theme';

function formatNotificationDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(date);
}

export function NotificationItem({
  notification,
  onPress,
}: {
  notification: AppNotification;
  onPress: () => void;
}) {
  const unread = notification.read_at === null;
  const iconName =
    notification.type === 'CITIZEN_RESPONSE'
      ? 'message-circle'
      : 'refresh-cw';

  return (
    <TouchableOpacity
      style={[styles.container, unread && styles.unreadContainer]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={notification.title}
    >
      <View style={styles.icon}>
        <Feather name={iconName} size={20} color={colors.brand.primary} />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, unread && styles.unreadTitle]}>
            {notification.title}
          </Text>
          {unread ? <View style={styles.unreadDot} /> : null}
        </View>
        <Text style={styles.message} numberOfLines={3}>
          {notification.message}
        </Text>
        <Text style={styles.date}>
          {formatNotificationDate(notification.created_at)}
        </Text>
      </View>
      {notification.occurrence_id ? (
        <Feather name="chevron-right" size={20} color={colors.text.secondary} />
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', padding: spacing.base, borderRadius: radius.lg, backgroundColor: colors.surface.card, borderWidth: 1, borderColor: colors.border.subtle },
  unreadContainer: { borderLeftWidth: 4, borderLeftColor: colors.brand.primary, backgroundColor: colors.surface.noticeInfo },
  icon: { width: 42, height: 42, marginRight: spacing.md, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface.page },
  content: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, fontSize: typography.sizes.base, fontWeight: typography.weights.medium, color: colors.text.primary },
  unreadTitle: { fontWeight: typography.weights.bold },
  unreadDot: { width: 8, height: 8, marginLeft: spacing.sm, borderRadius: radius.full, backgroundColor: colors.brand.primary },
  message: { marginTop: spacing.xs, fontSize: typography.sizes.sm, lineHeight: 18, color: colors.text.secondary },
  date: { marginTop: spacing.sm, fontSize: typography.sizes.xs, color: colors.text.secondary },
});

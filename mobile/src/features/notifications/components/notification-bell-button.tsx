import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MapStackParamList } from '@/navigation/types';
import { useNotifications } from '../contexts/notifications-context';
import { colors, radius, typography } from '@/shared/theme';

type NavigationProp = NativeStackNavigationProp<MapStackParamList>;

export function NotificationBellButton() {
  const navigation = useNavigation<NavigationProp>();
  const { unreadCount } = useNotifications();
  const badgeText = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => navigation.navigate('Notifications')}
      accessibilityRole="button"
      accessibilityLabel={
        unreadCount > 0
          ? `${unreadCount} notificações não lidas`
          : 'Notificações'
      }
    >
      <Feather name="bell" size={24} color={colors.brand.primary} />
      {unreadCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 1, right: 0, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.status.REJECTED, borderWidth: 2, borderColor: colors.surface.card },
  badgeText: { fontSize: 9, fontWeight: typography.weights.bold, color: colors.text.inverse },
});

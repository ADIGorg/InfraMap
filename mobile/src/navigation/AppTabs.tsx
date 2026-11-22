import React from 'react';
import { StyleSheet, Text, useWindowDimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppTabsParamList } from './types';
import { MapStack } from './MapStack';
import { MyOccurrencesStack } from './MyOccurrencesStack';
import { ProfileStack } from './ProfileStack';
import { NewOccurrenceStack } from './NewOccurrenceStack';
import { NotificationsProvider, useNotifications } from '@/features/notifications/contexts/notifications-context';
import { NotificationsScreen } from '@/features/notifications/screens/notifications-screen';
import { colors, radius, typography } from '@/shared/theme';

const Tab = createBottomTabNavigator<AppTabsParamList>();
const ACTION_SIZE = 44;
const LABEL_LINE_HEIGHT = 14;
const TAB_BAR_BASE_HEIGHT = 56;

function AppTabsNavigator() {
  const { bottom } = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const { unreadCount } = useNotifications();
  const badge = unreadCount > 99 ? '99+' : unreadCount || undefined;
  const barHeight = TAB_BAR_BASE_HEIGHT + Math.ceil(2 * LABEL_LINE_HEIGHT * Math.max(1, fontScale)) + bottom;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand.primary,
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarStyle: [styles.bar, { height: barHeight }],
        tabBarLabelPosition: 'below-icon',
        tabBarLabel: ({ children, color }) => (
          <Text style={[styles.label, { color }]} numberOfLines={2}>
            {children}
          </Text>
        ),
        tabBarIconStyle: styles.icon,
      }}
    >
      <Tab.Screen
        name="Map"
        component={MapStack}
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color, size }) => <Feather name="map" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="MyOccurrences"
        component={MyOccurrencesStack}
        options={{
          title: 'Minhas ocorrências',
          tabBarIcon: ({ color, size }) => <Feather name="file-text" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="NewOccurrence"
        component={NewOccurrenceStack}
        options={{
          title: 'Nova ocorrência',
          tabBarAccessibilityLabel: 'Nova ocorrência',
          tabBarIconStyle: styles.action,
          tabBarIcon: () => <Feather name="plus" size={26} color={colors.text.inverse} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'Alertas',
          tabBarAccessibilityLabel: unreadCount > 0 ? `Alertas, ${unreadCount} notificações não lidas` : 'Alertas',
          tabBarBadge: badge,
          tabBarBadgeStyle: styles.badge,
          tabBarIcon: ({ color, size }) => <Feather name="bell" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function AppTabs() {
  return <NotificationsProvider><AppTabsNavigator /></NotificationsProvider>;
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.surface.card, borderTopColor: colors.border.subtle },
  label: {
    alignSelf: 'stretch',
    textAlign: 'center',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    lineHeight: LABEL_LINE_HEIGHT,
    includeFontPadding: false,
  },
  icon: { height: ACTION_SIZE },
  action: {
    width: ACTION_SIZE,
    height: ACTION_SIZE,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primary,
  },
  badge: { backgroundColor: colors.status.REJECTED, color: colors.text.inverse },
});

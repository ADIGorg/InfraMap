import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import type { AppTabsParamList } from './types';
import { MapStack } from './MapStack';
import { MyOccurrencesStack } from './MyOccurrencesStack';
import { ProfileStack } from './ProfileStack';
import { NewOccurrenceStack } from './NewOccurrenceStack';
import { NotificationsProvider } from '@/features/notifications/contexts/notifications-context';
import { colors } from '@/shared/theme';

const Tab = createBottomTabNavigator<AppTabsParamList>();

function AppTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand.primary,
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarStyle: { height: 64, paddingBottom: 8, paddingTop: 8 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tab.Screen name="Map" component={MapStack} options={{ tabBarLabel: 'Mapa', tabBarIcon: ({ color, size }) => <Feather name="map" size={size} color={color} /> }} />
      <Tab.Screen name="MyOccurrences" component={MyOccurrencesStack} options={{ tabBarLabel: 'Minhas', tabBarIcon: ({ color, size }) => <Feather name="file-text" size={size} color={color} /> }} />
      <Tab.Screen name="NewOccurrence" component={NewOccurrenceStack} options={{ tabBarLabel: 'Nova', tabBarIcon: () => <View style={{ width: 56, height: 56, marginTop: -24, borderRadius: 28, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center' }}><Feather name="plus" size={28} color={colors.text.inverse} /></View> }} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ tabBarLabel: 'Perfil', tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}

export function AppTabs() {
  return <NotificationsProvider><AppTabsNavigator /></NotificationsProvider>;
}

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MapScreen } from '@/features/map/screens/map-screen';
import { colors } from '@/shared/theme';

const Tab = createBottomTabNavigator();

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand.primary,
        tabBarInactiveTintColor: colors.text.secondary,
      }}
    >
      <Tab.Screen name="Mapa" component={MapScreen} />
      {/* Adicionar outras tabs: Ocorrências, Nova, Perfil, Alertas */}
    </Tab.Navigator>
  );
}
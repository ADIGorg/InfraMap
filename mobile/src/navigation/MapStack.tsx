import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MapStackParamList } from './types';
import { PublicMapScreen } from '@/features/map/screens/public-map-screen';
import { NotificationsScreen } from '@/features/notifications/screens/notifications-screen';

const Stack = createNativeStackNavigator<MapStackParamList>();

export function MapStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PublicMap" component={PublicMapScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { AuthStack } from './AuthStack';
import { AppTabs } from './AppTabs';
import { LoadingScreen } from '@/shared/components/loading-screen';
import { ResetPasswordScreen } from '@/features/auth/screens/reset-password-screen';
import { PublicOccurrenceDetailScreen } from '@/features/occurrences/screens/public-occurrence-detail-screen';
import { MyOccurrenceDetailPlaceholderScreen } from '@/features/occurrences/screens/my-occurrence-detail-placeholder-screen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { session, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <Stack.Screen name="AppTabs" component={AppTabs} />
        ) : (
          <Stack.Screen name="AuthStack" component={AuthStack} />
        )}
        <Stack.Screen
          name="ResetPassword"
          component={ResetPasswordScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="PublicOccurrenceDetail"
          component={PublicOccurrenceDetailScreen}
        />
        <Stack.Screen
          name="MyOccurrenceDetail"
          component={MyOccurrenceDetailPlaceholderScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
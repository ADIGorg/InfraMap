import React from 'react';

import {
  NavigationContainer,
  createNavigationContainerRef,
  type LinkingOptions,
} from '@react-navigation/native';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import {
  useAuth,
} from '@/features/auth/hooks/use-auth';

import {
  useRecoveryLink,
} from '@/features/auth/hooks/use-recovery-link';

import {
  ResetPasswordScreen,
} from '@/features/auth/screens/reset-password-screen';

import {
  PublicOccurrenceDetailScreen,
} from '@/features/occurrences/screens/public-occurrence-detail-screen';

import {
  MyOccurrenceDetailScreen,
} from '@/features/occurrences/screens/my-occurrence-detail-screen';

import {
  LoadingScreen,
} from '@/shared/components/loading-screen';

import {
  AuthStack,
} from './AuthStack';

import {
  AppTabs,
} from './AppTabs';

import type {
  RootStackParamList,
} from './types';

const Stack =
  createNativeStackNavigator<
    RootStackParamList
  >();

const navigationRef =
  createNavigationContainerRef<
    RootStackParamList
  >();

const linking: LinkingOptions<
  RootStackParamList
> = {
  prefixes: [
    'inframap://',
  ],

  config: {
    screens: {
      AuthStack: {
        screens: {
          VerifyEmail: {
            path: 'verify-email',
            parse: {
              confirmed: (value: string) =>
                value === 'true',
            },
          },

          Login: 'login',
        },
      },
    },
  },
};

export function RootNavigator() {
  const {
    session,
    isLoading,
  } = useAuth();

  useRecoveryLink(navigationRef);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {session ? (
          <Stack.Screen
            name="AppTabs"
            component={AppTabs}
          />
        ) : (
          <Stack.Screen
            name="AuthStack"
            component={AuthStack}
          />
        )}

        <Stack.Screen
          name="ResetPassword"
          component={ResetPasswordScreen}
          options={{
            gestureEnabled: false,
          }}
        />

        <Stack.Screen
          name="PublicOccurrenceDetail"
          component={PublicOccurrenceDetailScreen}
        />

        <Stack.Screen
          name="MyOccurrenceDetail"
          component={MyOccurrenceDetailScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
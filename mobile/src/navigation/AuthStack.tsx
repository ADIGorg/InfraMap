import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from './types';
import { WelcomeScreen } from '@/features/auth/screens/welcome-screen';
import { LoginScreen } from '@/features/auth/screens/login-screen';
import { RegisterScreen } from '@/features/auth/screens/register-screen';
import { ForgotPasswordScreen } from '@/features/auth/screens/forgot-password-screen';
import { VerifyEmailScreen } from '@/features/auth/screens/verify-email-screen';
import { PublicMapScreen } from '@/features/map/screens/public-map-screen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
      <Stack.Screen name="PublicMap" component={PublicMapScreen} />
    </Stack.Navigator>
  );
}
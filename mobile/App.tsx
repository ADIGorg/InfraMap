import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth/hooks/use-auth';
import { RootNavigator } from '@/navigation/RootNavigator';
import { queryClient } from '@/infrastructure/query-client';
import { useAndroidImmersiveMode } from '@/shared/hooks/use-android-immersive-mode';

export default function App() {
  useAndroidImmersiveMode();
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
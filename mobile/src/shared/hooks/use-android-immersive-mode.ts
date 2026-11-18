import { useEffect } from 'react';

import {
  AppState,
  Platform,
} from 'react-native';

import { NavigationBar } from 'expo-navigation-bar';

function hideAndroidNavigationBar(): void {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    NavigationBar.setHidden(true);
  } catch (error) {
    console.warn(
      '[NavigationBar] Não foi possível ocultar a barra:',
      error,
    );
  }
}

export function useAndroidImmersiveMode(): void {
  useEffect(() => {
    hideAndroidNavigationBar();

    const subscription = AppState.addEventListener(
      'change',
      (nextState) => {
        if (nextState === 'active') {
          hideAndroidNavigationBar();
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);
}
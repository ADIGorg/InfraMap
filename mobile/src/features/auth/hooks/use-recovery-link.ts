import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import type { NavigationContainerRef } from '@react-navigation/native';
import { setSessionFromRecoveryUrl } from '../services/auth.service';
import type { RootStackParamList } from '@/navigation/types';

export function useRecoveryLink(
  navigationRef: NavigationContainerRef<RootStackParamList>,
) {
  useEffect(() => {
    let mounted = true;

    const handleUrl = async (url: string | null) => {
      if (!url || !mounted) return;

      const success = await setSessionFromRecoveryUrl(url);
      if (!success || !mounted) return;

      if (navigationRef.isReady()) {
        navigationRef.navigate('ResetPassword');
      }
    };

    // App estava fechado → abriu via link
    Linking.getInitialURL().then(handleUrl);

    // App estava aberto → recebe link
    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [navigationRef]);
}
import { useEffect, useRef } from 'react';

import * as Linking from 'expo-linking';

import type {
  NavigationContainerRef,
} from '@react-navigation/native';

import {
  setSessionFromRecoveryUrl,
} from '../services/auth.service';

import type {
  RootStackParamList,
} from '@/navigation/types';

const NAVIGATION_READY_RETRIES = 20;
const NAVIGATION_READY_DELAY_MS = 100;

function delay(
  milliseconds: number,
): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(
      resolve,
      milliseconds,
    );
  });
}

export function useRecoveryLink(
  navigationRef: NavigationContainerRef<RootStackParamList>,
): void {
  const handledUrlsRef = useRef<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    let mounted = true;

    const waitForNavigation = async (): Promise<boolean> => {
      for (
        let attempt = 0;
        attempt < NAVIGATION_READY_RETRIES;
        attempt += 1
      ) {
        if (!mounted) {
          return false;
        }

        if (navigationRef.isReady()) {
          return true;
        }

        await delay(
          NAVIGATION_READY_DELAY_MS,
        );
      }

      return false;
    };

    const handleUrl = async (
      url: string | null,
    ): Promise<void> => {
      if (!url || !mounted) {
        return;
      }

      if (
        !url.includes('reset-password') &&
        !url.includes('type=recovery')
      ) {
        return;
      }

      if (handledUrlsRef.current.has(url)) {
        return;
      }

      handledUrlsRef.current.add(url);

      const success = await setSessionFromRecoveryUrl(url);

      if (!success || !mounted) {
        handledUrlsRef.current.delete(url);
        return;
      }

      const navigationReady = await waitForNavigation();

      if (!navigationReady || !mounted) {
        return;
      }

      navigationRef.reset({
        index: 0,
        routes: [
          {
            name: 'ResetPassword',
          },
        ],
      });
    };

    void Linking.getInitialURL().then(handleUrl);

    const subscription = Linking.addEventListener(
      'url',
      (event) => {
        void handleUrl(event.url);
      },
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [navigationRef]);
}
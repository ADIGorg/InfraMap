import { useCallback, useEffect, useMemo, useRef } from 'react';
import { BackHandler } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type {
  AppTabsParamList,
  NewOccurrenceStackParamList,
} from '@/navigation/types';
import { useRegistrationFlow } from '../models/registration.model';

type SuccessRoute = RouteProp<NewOccurrenceStackParamList, 'Success'>;
type SuccessNavigation = NativeStackNavigationProp<
  NewOccurrenceStackParamList,
  'Success'
>;
type TabsNavigation = BottomTabNavigationProp<AppTabsParamList>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidOccurrenceId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function formatOccurrenceProtocol(id: string): string {
  if (!isValidOccurrenceId(id)) return '';
  return `#OC-${id.slice(0, 4).toUpperCase()}`;
}

export function useOccurrenceSuccessViewModel() {
  const navigation = useNavigation<SuccessNavigation>();
  const route = useRoute<SuccessRoute>();
  const resetDraft = useRegistrationFlow((state) => state.reset);
  const didResetRef = useRef(false);

  const occurrenceId = route.params.occurrenceId;
  const isConfirmed = isValidOccurrenceId(occurrenceId);
  const protocol = useMemo(
    () => formatOccurrenceProtocol(occurrenceId),
    [occurrenceId],
  );

  useEffect(() => {
    if (isConfirmed && !didResetRef.current) {
      didResetRef.current = true;
      resetDraft();
    }
  }, [isConfirmed, resetDraft]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (event.data.action.type === 'GO_BACK') {
        event.preventDefault();
      }
    });

    const hardwareBack = BackHandler.addEventListener(
      'hardwareBackPress',
      () => true,
    );

    return () => {
      unsubscribe();
      hardwareBack.remove();
    };
  }, [navigation]);

  const leaveSuccess = useCallback(
    (tab: 'MyOccurrences' | 'Map') => {
      const tabs = navigation.getParent<TabsNavigation>();

      navigation.reset({
        index: 0,
        routes: [{ name: 'CaptureEvidence' }],
      });

      if (tab === 'MyOccurrences') {
        tabs?.navigate('MyOccurrences', {
          screen: 'MyOccurrencesList',
        });
        return;
      }

      tabs?.navigate('Map', { screen: 'PublicMap' });
    },
    [navigation],
  );

  const viewMyOccurrences = useCallback(() => {
    if (!isConfirmed) return;
    leaveSuccess('MyOccurrences');
  }, [isConfirmed, leaveSuccess]);

  const returnToMap = useCallback(() => {
    if (!isConfirmed) return;
    leaveSuccess('Map');
  }, [isConfirmed, leaveSuccess]);

  const returnToLocation = useCallback(() => {
    if (isConfirmed) return;
    navigation.replace('Location');
  }, [isConfirmed, navigation]);

  return {
    occurrenceId,
    protocol,
    status: 'RECEIVED' as const,
    statusLabel: 'Recebido',
    isConfirmed,
    viewMyOccurrences,
    returnToMap,
    returnToLocation,
  };
}

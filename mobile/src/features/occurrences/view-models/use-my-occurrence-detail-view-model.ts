import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/navigation/types';
import type {
  HistoryEvent,
  MyOccurrenceDetail,
} from '@/shared/types/api';
import { AppError } from '@/shared/errors/app-error';

import { getMyOccurrenceById } from '../services/my-occurrences.service';
import { getOccurrenceHistory } from '../services/history.service';

const MIN_REFRESH_SECONDS = 30;
const SIGNED_URL_REFRESH_MARGIN_SECONDS = 60;

type NavProp = NativeStackNavigationProp<RootStackParamList>;

function valueAt(
  data: Record<string, unknown> | null,
  key: string,
): unknown {
  return data?.[key];
}

function eventVisibility(event: HistoryEvent): string | null {
  const eventData = [
    event.details,
    event.newData,
    event.previousData,
  ];

  const visibilityKeys = [
    'visibility',
    'observationVisibility',
    'observation_visibility',
  ];

  for (const data of eventData) {
    for (const key of visibilityKeys) {
      const value = valueAt(data, key);

      if (typeof value === 'string') {
        return value.toUpperCase();
      }
    }
  }

  return null;
}

export function isHistoryEventVisibleToAuthor(
  event: HistoryEvent,
): boolean {
  const visibility = eventVisibility(event);

  if (visibility === 'INTERNAL') {
    return false;
  }

  const action = event.action.toUpperCase();

  if (action.includes('OBSERVATION')) {
    return (
      visibility === 'CITIZEN_RESPONSE' ||
      action.includes('CITIZEN_RESPONSE')
    );
  }

  return true;
}

interface UseMyOccurrenceDetailViewModelParams {
  id: string;
}

export function useMyOccurrenceDetailViewModel({
  id,
}: UseMyOccurrenceDetailViewModelParams) {
  const navigation = useNavigation<NavProp>();

  const [detail, setDetail] =
    useState<MyOccurrenceDetail | null>(null);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const load = useCallback(
    async (showLoader = true): Promise<void> => {
      if (showLoader) {
        setIsLoading(true);
      }

      setError(null);

      try {
        const [occurrence, events] = await Promise.all([
          getMyOccurrenceById(id),
          getOccurrenceHistory(id),
        ]);

        setDetail(occurrence);

        setHistory(
          events.filter(isHistoryEventVisibleToAuthor),
        );
      } catch (err) {
        setDetail(null);
        setHistory([]);

        if (
          err instanceof AppError &&
          (err.statusCode === 403 ||
            err.statusCode === 404)
        ) {
          setError(
            err.statusCode === 403
              ? 'Você não tem permissão para acessar esta ocorrência.'
              : 'Ocorrência não encontrada ou indisponível.',
          );

          return;
        }

        setError(
          err instanceof AppError
            ? err.message
            : 'Não foi possível carregar a ocorrência.',
        );
      } finally {
        if (showLoader) {
          setIsLoading(false);
        }
      }
    },
    [id],
  );

  /*
   * A carga é agendada para evitar atualização síncrona de estado
   * diretamente no corpo do efeito, conforme a regra do React 19.
   */
  useEffect(() => {
    const initialLoadTimer = setTimeout(() => {
      void load();
    }, 0);

    return () => {
      clearTimeout(initialLoadTimer);
    };
  }, [load]);

  /*
   * A renovação das signed URLs é independente da carga inicial.
   * Quando as fotos são atualizadas, o timer anterior é substituído.
   */
  useEffect(() => {
    clearRefreshTimer();

    if (!detail?.photoUrls.length) {
      return undefined;
    }

    const shortestExpirationSeconds = Math.min(
      ...detail.photoUrls.map(
        (photo) => photo.expiresInSeconds,
      ),
    );

    const refreshAfterSeconds = Math.max(
      shortestExpirationSeconds -
        SIGNED_URL_REFRESH_MARGIN_SECONDS,
      MIN_REFRESH_SECONDS,
    );

    refreshTimerRef.current = setTimeout(() => {
      void load(false);
    }, refreshAfterSeconds * 1000);

    return clearRefreshTimer;
  }, [detail?.photoUrls, load, clearRefreshTimer]);

  /*
   * Ordenação crescente:
   * evento mais antigo no topo e evento mais recente no final.
   */
  const sortedHistory = useMemo(
    () =>
      [...history].sort(
        (first, second) =>
          Date.parse(first.createdAt) -
          Date.parse(second.createdAt),
      ),
    [history],
  );

  const reload = useCallback(
    async (): Promise<void> => {
      await load(true);
    },
    [load],
  );

  const refreshPhotos = useCallback(
    async (): Promise<void> => {
      await load(false);
    },
    [load],
  );

  const goBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return {
    detail,
    history: sortedHistory,
    isLoading,
    error,
    reload,
    refreshPhotos,
    goBack,
  };
}
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import type { AppNotification } from '@/shared/types/notifications';
import { AppError } from '@/shared/errors/app-error';
import { useNotifications } from '../contexts/notifications-context';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notifications.service';

const PAGE_SIZE = 20;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function useNotificationsViewModel() {
  const navigation = useNavigation<NavigationProp>();
  const { revision, notifyChanged } = useNotifications();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const load = useCallback(async (requestedPage: number, reset: boolean) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (reset) { setIsLoading(true); } else { setIsLoadingMore(true); }
    setError(null);
    try {
      const response = await getNotifications(requestedPage, PAGE_SIZE);
      const pageItems = Array.isArray(response.data) ? response.data : [];
      setItems((previous) => {
        const source = reset ? pageItems : [...previous, ...pageItems];
        const ids = new Set<string>();
        return source.filter((item) => {
          if (ids.has(item.id)) return false;
          ids.add(item.id);
          return true;
        });
      });
      setPage(requestedPage);
      setHasMore(requestedPage < response.pagination.total_pages);
    } catch (caught) {
      setError(
        caught instanceof AppError
          ? caught.message
          : 'Não foi possível carregar as notificações.',
      );
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(1, true), 0);
    return () => clearTimeout(timer);
  }, [load, revision]);

  const reload = useCallback(() => load(1, true), [load]);
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading || isLoadingMore) return;
    await load(page + 1, false);
  }, [hasMore, isLoading, isLoadingMore, load, page]);

  const openNotification = useCallback(
    async (notification: AppNotification) => {
      if (!notification.read_at) {
        try {
          await markNotificationRead(notification.id);
          const readAt = new Date().toISOString();
          setItems((previous) =>
            previous.map((item) =>
              item.id === notification.id ? { ...item, read_at: readAt } : item,
            ),
          );
          notifyChanged();
        } catch {
          // A navegação continua; REST reconcilia a leitura depois.
        }
      }
      if (notification.occurrence_id) {
        navigation.navigate('MyOccurrenceDetail', {
          id: notification.occurrence_id,
        });
      }
    },
    [navigation, notifyChanged],
  );

  const markAllRead = useCallback(async () => {
    if (isMarkingAll) return;
    setIsMarkingAll(true);
    setError(null);
    try {
      await markAllNotificationsRead();
      const readAt = new Date().toISOString();
      setItems((previous) =>
        previous.map((item) => ({ ...item, read_at: item.read_at ?? readAt })),
      );
      notifyChanged();
    } catch (caught) {
      setError(
        caught instanceof AppError
          ? caught.message
          : 'Não foi possível marcar as notificações como lidas.',
      );
    } finally {
      setIsMarkingAll(false);
    }
  }, [isMarkingAll, notifyChanged]);

  return {
    items,
    isLoading,
    isLoadingMore,
    isMarkingAll,
    error,
    hasMore,
    reload,
    loadMore,
    openNotification,
    markAllRead,
  };
}

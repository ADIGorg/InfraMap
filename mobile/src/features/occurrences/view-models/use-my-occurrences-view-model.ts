import { useCallback, useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { getMyOccurrences } from '../services/my-occurrences.service';
import type { MyOccurrenceListItem } from '@/shared/types/api';
import { AppError } from '@/shared/errors/app-error';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const PAGE_SIZE = 20;

export function useMyOccurrencesViewModel() {
  const navigation = useNavigation<NavProp>();
  const [items, setItems] = useState<MyOccurrenceListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (reset: boolean, currentPage: number) => {
    if (reset) setIsLoading(true);
    setError(null);
    try {
      const res = await getMyOccurrences({
        page: currentPage,
        pageSize: PAGE_SIZE,
        sort: 'recent',
      });
      // Deduplicação por id (proteção contra sobreposição de páginas)
      setItems((prev) => {
        const source = reset ? res.data : [...prev, ...res.data];
        const seen = new Set<string>();
        return source.filter((item) => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });
      });
      setHasMore(res.pagination.page < res.pagination.totalPages);
      setPage(currentPage);
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError('Não foi possível carregar suas ocorrências.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    const loadTimer = setTimeout(() => {
      void load(true, 1);
    }, 0);

    return () => {
      clearTimeout(loadTimer);
    };
  }, [load]);

  const refresh = useCallback(() => {
    setIsRefreshing(true);
    load(true, 1);
  }, [load]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || isLoading || isRefreshing) return;
    setIsLoadingMore(true);
    load(false, page + 1);
  }, [hasMore, isLoadingMore, isLoading, isRefreshing, page, load]);

  const openDetail = useCallback(
    (id: string) => {
      navigation.navigate('MyOccurrenceDetail', { id });
    },
    [navigation],
  );

  return {
    items,
    isLoading,
    isRefreshing,
    isLoadingMore,
    error,
    hasMore,
    refresh,
    loadMore,
    openDetail,
  };
}
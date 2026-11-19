import { useEffect, useState, useSyncExternalStore } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAdminIdentity } from '@/features/auth/hooks/use-admin-identity';
import { queryKeys } from '@/shared/types/query-keys';
import { AdminNotificationsService, deriveAlerts, type AdminAlert } from '../services/admin-notifications.service';

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

export function useAdminNotificationsViewModel() {
  const identity = useAdminIdentity();
  const enabled = identity.isSuccess && identity.data.role === 'ADMIN' && identity.data.is_active;
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine);
  const [page, setPage] = useState(1);
  const client = useQueryClient();
  const viewedKey = ['admin', 'notifications', 'viewed', identity.data?.id] as const;
  // Memória da sessão: AuthProvider limpa o QueryClient no logout/troca de conta.
  const viewed = useQuery<Record<string, string>>({ queryKey: viewedKey,
    queryFn: () => ({}), initialData: {}, enabled: false, gcTime: Infinity });
  const options = { enabled: enabled && online, retry: false, staleTime: 30_000,
    refetchInterval: 30_000, refetchIntervalInBackground: false } as const;
  const occurrences = useQuery({ ...options,
    queryKey: [...queryKeys.occurrences, 'notifications', page],
    queryFn: ({ signal }) => AdminNotificationsService.occurrences(page, signal),
  });
  const dashboard = useQuery({ ...options, queryKey: queryKeys.dashboard,
    queryFn: AdminNotificationsService.dashboard });
  const totalPages = Math.max(1, occurrences.data?.pagination.totalPages ?? 1);
  useEffect(() => {
    if (occurrences.isSuccess && page > totalPages) setPage(totalPages);
  }, [occurrences.isSuccess, page, totalPages]);
  const alerts = deriveAlerts(occurrences.data?.data ?? [], dashboard.data);
  const isViewed = (alert: AdminAlert) => viewed.data[alert.id] === alert.revision;
  const markViewed = (items: AdminAlert[]) => {
    if (!enabled) return;
    client.setQueryData<Record<string, string>>(viewedKey, current => ({
      ...current, ...Object.fromEntries(items.map(item => [item.id, item.revision])),
    }));
  };
  const refresh = () => { void occurrences.refetch(); void dashboard.refetch(); };
  return { identity, online, page, setPage, totalPages, occurrences, dashboard, alerts,
    isViewed, markViewed, refresh, busy: occurrences.isFetching || dashboard.isFetching };
}

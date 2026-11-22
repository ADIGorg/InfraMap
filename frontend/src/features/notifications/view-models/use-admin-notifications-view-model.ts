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

function useAdminAlerts(page: number) {
  const identity = useAdminIdentity();
  const enabled = identity.isSuccess && identity.data.role === 'ADMIN' && identity.data.is_active;
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine);
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
  const alerts = deriveAlerts(occurrences.data?.data ?? [], dashboard.data);
  const isViewed = (alert: AdminAlert) => viewed.data[alert.id] === alert.revision;
  const markViewed = (items: AdminAlert[]) => {
    if (!enabled) return;
    client.setQueryData<Record<string, string>>(viewedKey, current => ({
      ...current, ...Object.fromEntries(items.map(item => [item.id, item.revision])),
    }));
  };
  const refresh = () => { void occurrences.refetch(); void dashboard.refetch(); };
  return { identity, enabled, online, occurrences, dashboard, alerts,
    isViewed, markViewed, refresh, busy: occurrences.isFetching || dashboard.isFetching };
}

export function useHasUnreadAdminAlerts() {
  const { enabled, alerts, isViewed } = useAdminAlerts(1);
  return enabled && alerts.some(alert => !isViewed(alert));
}

export function useAdminNotificationsViewModel() {
  const [page, setPage] = useState(1);
  const vm = useAdminAlerts(page);
  const totalPages = Math.max(1, vm.occurrences.data?.pagination.totalPages ?? 1);
  const { isSuccess } = vm.occurrences;
  useEffect(() => {
    if (isSuccess && page > totalPages) setPage(totalPages);
  }, [isSuccess, page, totalPages]);
  return { ...vm, page, setPage, totalPages };
}

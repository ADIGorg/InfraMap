import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { queryKeys } from '@/shared/types/query-keys';
import {
  getAdminDashboard,
  getRecentAdminOccurrences,
  getHighPriorityAdminOccurrences,
} from '../services/dashboard.service';

const POLLING_MS = 30_000;

export function useAdminDashboardViewModel() {
  const [priorityPage, setPriorityPage] = useState(1);
  const dashboard = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: getAdminDashboard,
    staleTime: POLLING_MS,
    refetchInterval: POLLING_MS,
    retry: false,
  });

  const recent = useQuery({
    queryKey: [...queryKeys.occurrences, 'dashboard-recent', { page: 1, pageSize: 5, sort: 'recent' }] as const,
    queryFn: getRecentAdminOccurrences,
    staleTime: POLLING_MS,
    refetchInterval: POLLING_MS,
    retry: false,
  });

  const highPriority = useQuery({
    queryKey: [...queryKeys.occurrences, 'dashboard-high-priority', { priority: 'HIGH', page: priorityPage, pageSize: 3, sort: 'recent' }] as const,
    queryFn: ({ signal }) => getHighPriorityAdminOccurrences(priorityPage, signal),
    staleTime: POLLING_MS, refetchInterval: POLLING_MS, retry: false,
  });
  const priorityTotalPages = Math.max(1, highPriority.data?.pagination.totalPages ?? 1);
  useEffect(() => {
    if (highPriority.isSuccess && priorityPage > priorityTotalPages) setPriorityPage(priorityTotalPages);
  }, [highPriority.isSuccess, priorityPage, priorityTotalPages]);
  // Polling pertence ao QueryClient: desmontagem remove o observer e seu intervalo.
  const refresh = () => {
    void dashboard.refetch();
    void recent.refetch();
    void highPriority.refetch();
  };

  return {
    dashboard,
    recent,
    refresh,
    highPriority, priorityPage, setPriorityPage, priorityTotalPages,
    pollingSeconds: POLLING_MS / 1000,
  };
}

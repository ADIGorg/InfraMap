import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/types/query-keys';
import {
  getAdminDashboard,
  getRecentAdminOccurrences,
} from '../services/dashboard.service';

const POLLING_MS = 30_000;

export function useAdminDashboardViewModel() {
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

  // Polling pertence ao QueryClient: desmontagem remove o observer e seu intervalo.
  const refresh = () => {
    void dashboard.refetch();
    void recent.refetch();
  };

  return {
    dashboard,
    recent,
    refresh,
    highPriorityRecent: recent.data?.filter((item) => item.priority === 'HIGH') ?? [],
    pollingSeconds: POLLING_MS / 1000,
  };
}

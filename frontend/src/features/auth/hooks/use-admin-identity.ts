import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/types/query-keys';
import { getAdminIdentity } from '../services/admin-identity.service';

export function useAdminIdentity(enabled = true) {
  return useQuery({
    queryKey: queryKeys.adminMe,
    queryFn: getAdminIdentity,
    enabled,
    retry: false,
    staleTime: 30_000,
  });
}

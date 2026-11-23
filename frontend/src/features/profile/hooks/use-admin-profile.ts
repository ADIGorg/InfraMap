import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/types/query-keys';
import { getAdminProfile } from '../services/admin-profile.service';

export function useAdminProfile() {
  return useQuery({
    queryKey: queryKeys.adminProfile,
    queryFn: getAdminProfile,
    retry: false,
    staleTime: 60_000,
  });
}

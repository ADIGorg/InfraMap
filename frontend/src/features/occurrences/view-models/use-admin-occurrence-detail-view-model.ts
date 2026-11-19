import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useAdminIdentity } from '@/features/auth/hooks/use-admin-identity';
import { queryKeys } from '@/shared/types/query-keys';
import { getOccurrenceDetail } from '../services/occurrence-detail.service';
import { getOccurrenceHistory } from '../services/history.service';
import { getAgencies } from '../services/agencies.service';
import { getForwardings } from '../services/forwardings.service';
import { AdminOccurrencesService } from '../services/admin-occurrences.service';
import { useModerationViewModel } from './use-moderation-view-model';
import { useForwardingViewModel } from './use-forwarding-view-model';
import { useObservationsViewModel } from './use-observations-view-model';

export function useAdminOccurrenceDetailViewModel(id: string) {
  const identity = useAdminIdentity();
  const validId = z.uuid().safeParse(id).success;
  const enabled = validId && identity.isSuccess && identity.data.is_active && identity.data.role === 'ADMIN';
  const client = useQueryClient();
  const detail = useQuery({
    queryKey: queryKeys.occurrence(id),
    queryFn: ({ signal }) => getOccurrenceDetail(id, signal),
    enabled,
    refetchInterval: query => {
      const expires = query.state.data?.photoUrls.map(photo => Date.parse(photo.expiresAt)) ?? [];
      if (!expires.length) return false;
      return Math.min(2_147_483_647, Math.max(10_000, Math.min(...expires) - Date.now() - 15_000));
    },
  });
  const history = useQuery({ queryKey: [...queryKeys.occurrence(id), 'history'], queryFn: ({ signal }) => getOccurrenceHistory(id, signal), enabled });
  const forwardings = useQuery({ queryKey: [...queryKeys.occurrence(id), 'forwardings'], queryFn: ({ signal }) => getForwardings(id, signal), enabled });
  const agencies = useQuery({ queryKey: [...queryKeys.agencies, 'forwarding-options'], queryFn: ({ signal }) => getAgencies(signal), enabled });
  const categories = useQuery({ queryKey: ['categories'], queryFn: ({ signal }) => AdminOccurrencesService.categories(signal), enabled });
  const refresh = useCallback(async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.occurrences }),
      client.invalidateQueries({ queryKey: queryKeys.dashboard }),
    ]);
  }, [client]);
  const canAct = enabled && detail.isSuccess && !detail.isFetching;
  const moderation = useModerationViewModel(detail.data, canAct, refresh);
  const forwarding = useForwardingViewModel(id, canAct && detail.data?.status === 'CONFIRMED' && !moderation.isPending, refresh);
  const observations = useObservationsViewModel(moderation.submit);
  return { validId, identity, detail, history, forwardings, agencies, categories, moderation, forwarding, observations, canAct };
}


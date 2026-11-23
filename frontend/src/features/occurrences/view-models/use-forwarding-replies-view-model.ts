import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/types/query-keys';
import { getForwardingReplies } from '../services/forwarding-replies.service';

export function useForwardingRepliesViewModel(occurrenceId: string, forwardingId: string) {
  const [expanded, setExpanded] = useState(false);

  const replies = useQuery({
    queryKey: queryKeys.forwardingReplies(occurrenceId, forwardingId),
    queryFn: ({ signal }) => getForwardingReplies(occurrenceId, forwardingId, signal),
    enabled: expanded,
    staleTime: 10_000,
    // Não há polling; ao abrir ou sincronizar, o React Query consulta a API.
  });

  return {
    expanded,
    toggle: () => setExpanded(current => !current),
    replies,
  };
}

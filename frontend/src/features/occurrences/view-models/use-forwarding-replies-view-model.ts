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
    // Consulta apenas a API do backend. O agendamento IMAP é independente.
    refetchInterval: expanded ? 60_000 : false,
  });

  return {
    expanded,
    toggle: () => setExpanded(current => !current),
    replies,
  };
}

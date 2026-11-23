import { useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/types/query-keys';
import { syncForwardingReplies } from '../services/forwarding-replies.service';

/** Sincroniza ao montar a página com encaminhamentos enviados; manualmente sob demanda. */
export function useForwardingRepliesSyncViewModel(occurrenceId: string, enabled: boolean) {
  const client = useQueryClient();
  const started = useRef(false);

  const mutation = useMutation({
    mutationFn: () => syncForwardingReplies(occurrenceId),
    retry: false,
    onSuccess: async () => {
      // Invalida tanto a lista de encaminhamentos quanto as respostas abertas.
      await client.invalidateQueries({
        queryKey: [...queryKeys.occurrence(occurrenceId), 'forwardings'],
      });
    },
  });

  const { mutate, mutateAsync } = mutation;
  useEffect(() => {
    if (!enabled || started.current) return;
    started.current = true;
    mutate();
  }, [enabled, mutate]);

  return {
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    // Falhas da mutation ficam disponíveis em `isError` para a interface.
    sync: async () => { await mutateAsync(); },
  };
}

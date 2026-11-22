import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { isAppError, safeErrorMessage } from '@/shared/errors/app-error';
import { allowedActions, moderateOccurrence, type ModerationRequest } from '../services/detail-moderation.service';
import type { OccurrenceDetail } from '../services/occurrence-detail.service';

export function useModerationViewModel(detail: OccurrenceDetail | undefined, canAct: boolean, refresh: () => Promise<void>) {
  const [message, setMessage] = useState('');
  const [isPending, setPending] = useState(false);
  const lock = useRef(false);
  const mutation = useMutation({
    mutationFn: (request: ModerationRequest) => moderateOccurrence(detail!.id, request),
    retry: false,
  });
  async function submit(request: ModerationRequest) {
    if (!detail || !canAct || lock.current || !allowedActions(detail).includes(request.action)) return false;
    lock.current = true;
    setPending(true);
    setMessage('');
    try {
      await mutation.mutateAsync(request);
      setMessage('Alteração registrada com sucesso.');
      return true;
    } catch (error) {
      if (request.action === 'reject' && isAppError(error) && error.statusCode >= 500) {
        setMessage('Não foi possível confirmar a rejeição. Confira o status atualizado da ocorrência antes de tentar novamente.');
      } else {
        setMessage(isAppError(error) && error.statusCode === 409
          ? 'A ocorrência foi alterada. Confira os dados atualizados antes de tentar novamente.'
          : safeErrorMessage(error));
      }
      return false;
    } finally {
      await refresh();
      lock.current = false;
      setPending(false);
    }
  }
  return { submit, isPending, message, error: mutation.isError ? message : '' };
}


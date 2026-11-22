import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createForwarding, type ForwardingInput } from '../services/forwardings.service';
import { safeErrorMessage } from '@/shared/errors/app-error';

export function useForwardingViewModel(id: string, canForward: boolean, refresh: () => Promise<void>) {
  const [message, setMessage] = useState('');
  const [isPending, setPending] = useState(false);
  const [needsReview, setNeedsReview] = useState(false);
  const lock = useRef(false);
  const mutation = useMutation({ mutationFn: (input: ForwardingInput) => createForwarding(id, input), retry: false });
  async function submit(input: ForwardingInput) {
    if (!canForward || needsReview || lock.current) return false;
    lock.current = true;
    setPending(true);
    try {
      const result = await mutation.mutateAsync(input);
      setMessage(result.status === 'SENT' ? 'Encaminhamento registrado e aceito pelo provedor de e-mail. A entrega ainda não foi confirmada.'
        : result.status === 'FAILED' ? 'Encaminhamento registrado, mas o envio falhou. Confira o histórico antes de reenviar.'
        : 'Encaminhamento registrado e aguardando envio.');
      setNeedsReview(result.status !== 'SENT');
      return result.status === 'SENT';
    } catch (error) {
      setMessage(safeErrorMessage(error) + ' Consulte o histórico antes de reenviar.');
      setNeedsReview(true);
      return false;
    } finally {
      await refresh();
      lock.current = false;
      setPending(false);
    }
  }
  return { submit, message, isPending, needsReview, acknowledgeReview: () => setNeedsReview(false) };
}


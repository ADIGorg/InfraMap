import { useState } from 'react';
import { z } from 'zod';
import { requestPasswordReset } from '../services/auth.service';

const emailSchema = z.email('Informe um e-mail válido.');

export function useAdminPasswordRecoveryViewModel() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [invalid, setInvalid] = useState('');
  const [networkError, setNetworkError] = useState('');

  const submit = async () => {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setInvalid(parsed.error.issues[0]?.message ?? 'E-mail inválido.');
      return;
    }
    setInvalid('');
    setNetworkError('');
    setSubmitting(true);
    try {
      await requestPasswordReset(parsed.data, window.location.origin + '/reset-password');
      setSubmitted(true);
    } catch {
      setNetworkError('Não foi possível enviar agora. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return { email, setEmail, isSubmitting, submitted, invalid, networkError, submit };
}

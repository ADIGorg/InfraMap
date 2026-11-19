import { useRef, useState } from 'react';
import { z } from 'zod';
import { requestPasswordReset } from '../services/auth.service';

const emailSchema = z.email('Informe um e-mail válido.');

export function useAdminPasswordRecoveryViewModel() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [invalid, setInvalid] = useState('');
  const [networkError, setNetworkError] = useState('');
  const pendingRef = useRef(false);

  const submit = async () => {
    if (pendingRef.current) return;
    const parsed = emailSchema.safeParse(email.trim());
    if (!parsed.success) {
      setInvalid(parsed.error.issues[0]?.message ?? 'E-mail inválido.');
      return;
    }
    pendingRef.current = true;
    setInvalid('');
    setNetworkError('');
    setSubmitting(true);
    try {
      // A URL deve estar na allowlist do Supabase.
      await requestPasswordReset(parsed.data, window.location.origin + '/confirm-recovery');
      setSubmitted(true);
    } catch {
      // Independente de existência de usuário, não revelar e-mail cadastrado.
      setSubmitted(true);
    } finally {
      pendingRef.current = false;
      setSubmitting(false);
    }
  };

  return { email, setEmail, isSubmitting, submitted, invalid, networkError, submit };
}

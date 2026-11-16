import { useState } from 'react';
import { supabase } from '@/infrastructure/api/supabase-client';

export function useResetPasswordViewModel() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isSaving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (password.length < 8 || password.length > 72 || password !== confirmation) {
      setError('Use uma senha de 8 a 72 caracteres e confirme-a corretamente.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error('Recovery session required');
      const result = await supabase.auth.updateUser({ password });
      if (result.error) throw result.error;
      setSuccess(true);
    } catch {
      setError('O link de recuperação é inválido ou expirou. Solicite outro link.');
    } finally {
      setSaving(false);
    }
  };
  return { password, setPassword, confirmation, setConfirmation, isSaving, success, error, submit };
}

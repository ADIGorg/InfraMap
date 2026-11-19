import { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { changeRecoveredPassword } from '../services/auth.service';

interface RecoveryRouteState { recoveryVerified?: boolean }

export function useResetPasswordViewModel() {
  const location = useLocation();
  const canReset = (location.state as RecoveryRouteState | null)?.recoveryVerified === true;
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isSaving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const pendingRef = useRef(false);

  const submit = async () => {
    if (!canReset || pendingRef.current || success) return;
    if (password.length < 8 || password.length > 72 || password !== confirmation) {
      setError('Use uma senha de 8 a 72 caracteres e confirme-a corretamente.');
      return;
    }
    pendingRef.current = true;
    setSaving(true);
    setError('');
    try {
      await changeRecoveredPassword(password);
      setPassword('');
      setConfirmation('');
      setSuccess(true);
    } catch {
      setError('Não foi possível atualizar a senha. Verifique sua sessão ou solicite outro link.');
    } finally {
      pendingRef.current = false;
      setSaving(false);
    }
  };
  return { canReset, password, setPassword, confirmation, setConfirmation, isSaving, success, error, submit };
}

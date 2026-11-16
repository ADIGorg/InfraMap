import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/navigation/types';
import { forgotPasswordSchema } from '@/features/auth/schemas/forgot-password-schema';
import { requestPasswordReset } from '@/features/auth/services/auth.service';
import { AppError } from '@/shared/errors/app-error';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

interface FormErrors {
  email?: string;
  general?: string;
}

const COOLDOWN_SECONDS = 60;

export function usePasswordRecoveryViewModel() {
  const navigation = useNavigation<NavigationProp>();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const cooldownUntilRef = useRef<number>(0);

  // Countdown do cooldown
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  const goBack = () => navigation.goBack();

  const clearError = (field: keyof FormErrors) => {
    setFormErrors((prev) => ({ ...prev, [field]: undefined, general: undefined }));
  };

  const handleSubmit = useCallback(async () => {
    if (isLoading) return;
    if (Date.now() < cooldownUntilRef.current) return;

    setFormErrors({});

    const validation = forgotPasswordSchema.safeParse({ email });
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      setFormErrors({ email: fieldErrors.email?.[0] });
      return;
    }

    setIsLoading(true);
    try {
      await requestPasswordReset(validation.data.email);
      // Sucesso silencioso → sem mensagem que diferencie existência do e-mail.
      // O banner anti-enumeração já está visível na tela o tempo todo.
      cooldownUntilRef.current = Date.now() + COOLDOWN_SECONDS * 1000;
      setSecondsLeft(COOLDOWN_SECONDS);
    } catch (error) {
      if (error instanceof AppError) {
        setFormErrors({ general: error.message });
      } else {
        setFormErrors({ general: 'Erro inesperado. Tente novamente.' });
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, isLoading]);

  const isCooldownActive = secondsLeft > 0;
  const submitLabel = isCooldownActive
    ? `Aguarde ${secondsLeft}s`
    : 'Enviar link de recuperação';

  return {
    email,
    setEmail,
    isLoading,
    isCooldownActive,
    submitLabel,
    formErrors,
    clearError,
    handleSubmit,
    goBack,
  };
}
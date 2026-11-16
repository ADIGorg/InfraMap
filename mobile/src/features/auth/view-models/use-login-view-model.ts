import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/navigation/types';
import { loginSchema } from '@/features/auth/schemas/login-schema';
import {
  loginWithPassword,
  validateCitizenIdentity,
  logout,
} from '@/features/auth/services/auth.service';
import { AppError } from '@/shared/errors/app-error';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export function useLoginViewModel() {
  const navigation = useNavigation<NavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const togglePasswordVisibility = () => setIsPasswordVisible((v) => !v);

  const goToRegister = () => navigation.navigate('Register');
  const goToForgotPassword = () => navigation.navigate('ForgotPassword');

  const clearError = (field: keyof FormErrors) => {
    setFormErrors((prev) => ({ ...prev, [field]: undefined, general: undefined }));
  };

  const handleSubmit = async () => {
    if (isLoading) return; // Previne double-submit

    setFormErrors({});
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      setFormErrors({
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
      });
      return;
    }

    setIsLoading(true);
    try {
      // 1) Login no Supabase Auth
      await loginWithPassword(validation.data.email, validation.data.password);

      // 2) Valida identidade ANTES de permitir acesso (ADMIN/inativo bloqueado)
      try {
        await validateCitizenIdentity();
        // Session válida + CITIZEN ativo → RootNavigator alterna para AppTabs automaticamente
      } catch (identityError) {
        // Falha de validação → força logout para não deixar sessão órfã
        await logout();
        throw identityError;
      }
    } catch (error) {
      if (error instanceof AppError) {
        setFormErrors({ general: error.message });
      } else {
        setFormErrors({ general: 'Erro inesperado. Tente novamente.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    email, setEmail,
    password, setPassword,
    isPasswordVisible, togglePasswordVisibility,
    isLoading,
    formErrors, clearError,
    handleSubmit,
    goToRegister, goToForgotPassword,
  };
}
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { resetPasswordSchema } from '../schemas/reset-password-schema';
import { updatePassword } from '../services/auth.service';
import { AppError } from '@/shared/errors/app-error';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ResetPassword'>;

interface FormErrors {
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export function useResetPasswordViewModel() {
  const navigation = useNavigation<NavigationProp>();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const togglePasswordVisibility = () => setIsPasswordVisible((v) => !v);
  const toggleConfirmVisibility = () => setIsConfirmVisible((v) => !v);

  const clearError = (field: keyof FormErrors) => {
    setFormErrors((prev) => ({ ...prev, [field]: undefined, general: undefined }));
  };

  const handleSubmit = async () => {
    if (isLoading) return;

    setFormErrors({});

    const validation = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      setFormErrors({
        password: fieldErrors.password?.[0],
        confirmPassword: fieldErrors.confirmPassword?.[0],
      });
      return;
    }

    setIsLoading(true);
    try {
      await updatePassword(validation.data.password);
      setIsSuccess(true);
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

  const goToApp = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'AppTabs' }],
    });
  };

  return {
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    isPasswordVisible,
    togglePasswordVisibility,
    isConfirmVisible,
    toggleConfirmVisibility,
    isLoading,
    isSuccess,
    formErrors,
    clearError,
    handleSubmit,
    goToApp,
  };
}
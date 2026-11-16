import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/navigation/types';
import { signupSchema } from '@/features/auth/schemas/signup-schema';
import { signup, validateCitizenIdentity, logout } from '@/features/auth/services/auth.service';
import { AppError } from '@/shared/errors/app-error';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  acceptedTerms?: string;
  general?: string;
}

export function useSignupViewModel() {
  const navigation = useNavigation<NavigationProp>();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const togglePasswordVisibility = () => setIsPasswordVisible((v) => !v);
  const toggleConfirmPasswordVisibility = () => setIsConfirmPasswordVisible((v) => !v);

  const goToLogin = () => navigation.navigate('Login');

  const clearError = (field: keyof FormErrors) => {
    setFormErrors((prev) => ({ ...prev, [field]: undefined, general: undefined }));
  };

  const handleSubmit = async () => {
    if (isLoading) return;

    setFormErrors({});

    const validation = signupSchema.safeParse({
      name, email, password, confirmPassword, acceptedTerms,
    });

    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      setFormErrors({
        name: fieldErrors.name?.[0],
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
        confirmPassword: fieldErrors.confirmPassword?.[0],
        acceptedTerms: fieldErrors.acceptedTerms?.[0],
      });
      return;
    }

    setIsLoading(true);
    try {
      const { session } = await signup({
        name: validation.data.name,
        email: validation.data.email,
        password: validation.data.password,
      });

      if (session) {
        // Confirmação de e-mail desabilitada (local dev): sessão já existe
        // Valida identidade antes de permitir — trigger cria CITIZEN por padrão
        try {
          await validateCitizenIdentity();
          // RootNavigator alterna para AppTabs via onAuthStateChange
        } catch (identityError) {
          await logout(); // Falha → força logout para não deixar sessão órfã
          throw identityError;
        }
      } else {
        // Confirmação habilitada (staging/prod) → orienta a confirmar e-mail
        navigation.navigate('VerifyEmail', { email: validation.data.email });
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
    name, setName,
    email, setEmail,
    password, setPassword,
    confirmPassword, setConfirmPassword,
    acceptedTerms, setAcceptedTerms,
    isPasswordVisible, togglePasswordVisibility,
    isConfirmPasswordVisible, toggleConfirmPasswordVisibility,
    isLoading,
    formErrors, clearError,
    handleSubmit,
    goToLogin,
  };
}
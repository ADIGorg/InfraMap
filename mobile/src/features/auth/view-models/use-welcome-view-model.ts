import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/navigation/types';
import { useAuth } from '@/features/auth/hooks/use-auth';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

export function useWelcomeViewModel() {
  const navigation = useNavigation<NavigationProp>();
  const { session } = useAuth(); // Model: estado compartilhado de auth

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  const navigateToRegister = () => {
    navigation.navigate('Register');
  };

  const navigateToExploreMap = () => {
    // RN022 / Regra do ticket: Explorar mapa não exige autenticação
    navigation.navigate('PublicMap');
  };

  return {
    session,
    isAuthenticated: !!session,
    navigateToLogin,
    navigateToRegister,
    navigateToExploreMap,
  };
}
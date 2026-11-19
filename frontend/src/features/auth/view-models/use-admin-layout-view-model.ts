import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../hooks/use-auth';
import { useUiStore } from '@/shared/state/use-ui-store';
import { queryClient } from '@/infrastructure/query-client';

export function useAdminLayoutViewModel() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const isMobileNavOpen = useUiStore((state) => state.isMobileNavOpen);
  const setMobileNavOpen = useUiStore((state) => state.setMobileNavOpen);

  const logout = async () => {
    setLogoutError(null);
    try {
      await signOut();
      queryClient.clear();
      useUiStore.getState().reset();
      navigate('/login', { replace: true });
    } catch {
      setLogoutError('Não foi possível sair. Tente novamente.');
    }
  };

  return { logout, logoutError, isMobileNavOpen, setMobileNavOpen };
}

import { useContext } from 'react';
import { AuthContext, type AuthState } from './auth-context';

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa do AuthProvider.');
  return context;
}

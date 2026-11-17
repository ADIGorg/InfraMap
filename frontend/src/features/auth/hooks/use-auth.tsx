import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/infrastructure/api/supabase-client';
import { queryClient } from '@/infrastructure/query-client';
import { useUiStore } from '@/shared/state/use-ui-store';
import { signOutAdmin } from '../services/auth.service';

interface AuthState {
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let currentUserId: string | null = null;
    const applySession = (next: Session | null) => {
      if (!mounted) return;
      const nextUserId = next?.user.id ?? null;
      if (currentUserId !== nextUserId) {
        queryClient.clear();
        useUiStore.getState().reset();
      }
      currentUserId = nextUserId;
      setSession(next);
      setIsLoading(false);
    };
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      applySession(next);
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      applySession(error ? null : data.session);
    }).catch(() => applySession(null));
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  const value = useMemo<AuthState>(
    () => ({ session, isLoading, signOut: signOutAdmin }),
    [session, isLoading],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa do AuthProvider.');
  return context;
}

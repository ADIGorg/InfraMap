import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { supabase } from '@/infrastructure/api/supabase-auth';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { getUnreadCount } from '../services/notifications.service';

const POLLING_INTERVAL_MS = 60_000;

interface NotificationsContextData {
  unreadCount: number;
  revision: number;
  isLoadingUnreadCount: boolean;
  refreshNotifications: () => Promise<void>;
  notifyChanged: () => void;
}

const NotificationsContext = createContext<NotificationsContextData | undefined>(
  undefined,
);

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [unreadCount, setUnreadCount] = useState(0);
  const [revision, setRevision] = useState(0);
  const [isLoadingUnreadCount, setIsLoadingUnreadCount] = useState(false);
  const isAppActiveRef = useRef( AppState.currentState === 'active', );
  const refreshingRef = useRef(false);

  const refreshNotifications = useCallback(async () => {
    if (!userId || refreshingRef.current) return;
    refreshingRef.current = true;
    setIsLoadingUnreadCount(true);
    try {
      setUnreadCount(await getUnreadCount());
    } catch (error) {
      console.error('[Notifications] Falha ao carregar não lidas:', error);
    } finally {
      refreshingRef.current = false;
      setIsLoadingUnreadCount(false);
    }
  }, [userId]);

  const notifyChanged = useCallback(() => {
    setRevision((current) => current + 1);
    void refreshNotifications();
  }, [refreshNotifications]);

  useEffect(() => {
    if (!userId) {
      const timer = setTimeout(() => {
        setUnreadCount(0);
        setRevision(0);
      }, 0);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => void refreshNotifications(), 0);
    return () => clearTimeout(timer);
  }, [refreshNotifications, userId]);

  useEffect(() => {
    if (!userId) return;
    const subscription = AppState.addEventListener(
      'change',
      (nextState) => {
        const wasActive = isAppActiveRef.current;
        const isActive = nextState === 'active';

        isAppActiveRef.current = isActive;

        if (!wasActive && isActive) {
          notifyChanged();
        }
      },
    );
    const polling = setInterval(() => {
      if ( isAppActiveRef.current ) { void refreshNotifications(); }
    }, POLLING_INTERVAL_MS);
    return () => {
      subscription.remove();
      clearInterval(polling);
    };
  }, [notifyChanged, refreshNotifications, userId]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => notifyChanged(),
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn(
            '[Notifications] Realtime indisponível. Polling continuará ativo.',
          );
        }
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [notifyChanged, userId]);

  return (
    <NotificationsContext.Provider
      value={{
        unreadCount,
        revision,
        isLoadingUnreadCount,
        refreshNotifications,
        notifyChanged,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextData {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error(
      'useNotifications deve ser usado dentro de NotificationsProvider.',
    );
  }
  return context;
}

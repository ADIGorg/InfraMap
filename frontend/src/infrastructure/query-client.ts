import { QueryClient } from '@tanstack/react-query';
import { isAppError } from '@/shared/errors/app-error';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: (attempt, error) => {
        if (isAppError(error) && error.statusCode >= 400 && error.statusCode < 500) {
          return false;
        }
        return attempt < 2;
      },
    },
    mutations: { retry: false },
  },
});

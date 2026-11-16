import { QueryClient } from '@tanstack/react-query';
import { AppError } from '@/shared/errors/app-error';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof AppError && error.statusCode >= 400 && error.statusCode < 500) {
          return false; // Não retry em erros do cliente (4xx)
        }
        return failureCount < 2;
      },
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    },
    mutations: { retry: false },
  },
});
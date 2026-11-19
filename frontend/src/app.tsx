import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from '@/infrastructure/query-client';
import { AuthProvider } from '@/features/auth/hooks/auth-provider';
import { AppRouter } from '@/routes/app-router';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRouter />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

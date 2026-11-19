import { LoaderCircle } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-screen items-center justify-center gap-3 bg-surface-page text-brand-primary">
      <LoaderCircle aria-hidden="true" className="h-6 w-6 animate-spin" />
      <span>Carregando...</span>
    </div>
  );
}

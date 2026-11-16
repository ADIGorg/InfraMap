import { MapPin } from 'lucide-react';
import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-page px-4 py-8">
      <div className="w-full max-w-[480px] rounded-2xl bg-white p-8 shadow-card sm:p-12">
        <div className="mb-10 flex flex-col items-center gap-3">
          <span className="rounded-2xl bg-brand-primary p-3 text-white">
            <MapPin aria-hidden="true" size={29} />
          </span>
          <span className="text-3xl font-extrabold text-brand-primary">InfraMap</span>
          <p className="text-center text-sm text-ink-secondary">
            Gestão Administrativa de Infraestrutura
          </p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}

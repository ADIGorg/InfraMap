import { Menu, X, MapPin, BarChart3, List, Bell, Users, Building2, LogOut, MapPinned } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAdminIdentity } from '@/features/auth/hooks/use-admin-identity';
import { useAdminLayoutViewModel } from '@/features/auth/view-models/use-admin-layout-view-model';
import { Button } from '@/shared/components/button';
import { cn } from '@/shared/utils/cn';

const menu = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: BarChart3 },
  { label: 'Mapa Administrativo', to: '/admin/map', icon: MapPinned },
  { label: 'Ocorrências', to: '/admin/occurrences', icon: List },
  { label: 'Notificações', to: '/admin/notifications', icon: Bell },
  { label: 'Gestão de Órgãos', to: '/admin/agencies', icon: Building2 },
];

export function AdminLayout() {
  const { data: identity } = useAdminIdentity();
  const { logout, logoutError, isMobileNavOpen, setMobileNavOpen } = useAdminLayoutViewModel();
  const isMaster = identity?.admin_level === 'MASTER';

  return (
    <div className="min-h-screen bg-surface-page">
      {isMobileNavOpen && (
        <button type="button" aria-label="Fechar menu" className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setMobileNavOpen(false)} />
      )}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-brand-primary px-6 py-6 text-white transition-transform lg:translate-x-0',
        isMobileNavOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        <div className="mb-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin className="rounded-xl bg-brand-secondary p-2 text-white" size={43} aria-hidden="true" />
            <span className="text-xl font-extrabold">InfraMap</span>
          </div>
          <button className="lg:hidden" onClick={() => setMobileNavOpen(false)} aria-label="Fechar menu lateral"><X /></button>
        </div>
        <nav aria-label="Navegação administrativa" className="flex flex-1 flex-col gap-1">
          {menu.map(({ label, to, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setMobileNavOpen(false)}
              className={({ isActive }) => cn('side-nav-link', isActive && 'side-nav-link-active')}>
              <Icon size={19} aria-hidden="true" /><span>{label}</span>
            </NavLink>
          ))}
          {isMaster && (
            <NavLink to="/admin/admins" onClick={() => setMobileNavOpen(false)}
              className={({ isActive }) => cn('side-nav-link', isActive && 'side-nav-link-active')}>
              <Users size={19} aria-hidden="true" /> Gestão de Admins
            </NavLink>
          )}
        </nav>
        <Button variant="secondary" onClick={() => void logout()} className="w-full">
          <LogOut size={17} aria-hidden="true" /> Sair
        </Button>
        {logoutError && <p role="alert" className="mt-3 text-xs text-red-100">{logoutError}</p>}
        <p className="mt-8 border-t border-white/10 pt-6 text-xs text-brand-secondary">Versão 0.1 • Sprint 3</p>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex min-h-[72px] items-center justify-between gap-4 border-b border-line-subtle bg-white px-4 md:px-8">
          <div className="flex items-center gap-3">
            <button type="button" className="rounded-lg p-2 text-brand-primary hover:bg-surface-info lg:hidden"
              aria-label="Abrir menu" onClick={() => setMobileNavOpen(true)}>
              <Menu size={22} />
            </button>
            <span className="text-sm font-semibold text-brand-primary">Painel de Controle Centralizado</span>
          </div>
          <div className="text-right text-xs text-ink-secondary">
            <p className="font-semibold text-ink-primary">Administrador</p>
            <p>{isMaster ? 'Master' : identity?.admin_level === 'OPERATIONAL' ? 'Operacional' : 'Nível não informado'}</p>
          </div>
        </header>
        <main id="main-content"><Outlet /></main>
      </div>
    </div>
  );
}

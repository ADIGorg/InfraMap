import { Menu, X, MapPin, BarChart3, List, Bell, Users, Building2, LogOut, MapPinned, CircleUserRound } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAdminIdentity } from '@/features/auth/hooks/use-admin-identity';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useAdminProfile } from '@/features/profile/hooks/use-admin-profile';
import { useAdminLayoutViewModel } from '@/features/auth/view-models/use-admin-layout-view-model';
import { useHasUnreadAdminAlerts } from '@/features/notifications/view-models/use-admin-notifications-view-model';
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
  const { session } = useAuth();
  const { data: profile } = useAdminProfile();
  const { logout, logoutError, isMobileNavOpen, setMobileNavOpen } = useAdminLayoutViewModel();
  const isMaster = identity?.admin_level === 'MASTER';
  const hasUnreadAlerts = useHasUnreadAdminAlerts();
  const accountName = profile?.name ?? 'Administrador';
  const accountEmail = profile?.email ?? session?.user.email ?? 'E-mail indisponível';
  const accountLevel = isMaster ? 'Master' : identity?.admin_level === 'OPERATIONAL' ? 'Operacional' : 'Administrador';

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
              <span className="relative shrink-0">
                <Icon size={19} aria-hidden="true" />
                {to === '/admin/notifications' && hasUnreadAlerts && (
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-400 ring-2 ring-brand-primary" aria-hidden="true" />
                )}
              </span>
              <span>{label}</span>
              {to === '/admin/notifications' && hasUnreadAlerts && <span className="sr-only">com alertas não visualizados</span>}
            </NavLink>
          ))}
          {isMaster && (
            <NavLink to="/admin/admins" onClick={() => setMobileNavOpen(false)}
              className={({ isActive }) => cn('side-nav-link', isActive && 'side-nav-link-active')}>
              <Users size={19} aria-hidden="true" /> Gestão de Admins
            </NavLink>
          )}
        </nav>
        <NavLink to="/admin/profile" onClick={() => setMobileNavOpen(false)}
          className={({ isActive }) => cn('side-nav-link mb-3', isActive && 'side-nav-link-active')}>
          <CircleUserRound size={19} aria-hidden="true" /> Meu perfil
        </NavLink>
        <Button variant="secondary" onClick={() => void logout()} className="w-full">
          <LogOut size={17} aria-hidden="true" /> Sair
        </Button>
        {logoutError && <p role="alert" className="mt-3 text-xs text-red-100">{logoutError}</p>}
        <p className="mt-8 border-t border-white/10 pt-6 text-xs text-brand-secondary">Versão 0.1</p>
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
          <NavLink to="/admin/profile" aria-label="Abrir meu perfil" title="Abrir meu perfil"
            className="group flex min-w-0 items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-surface-info">
            <div className="hidden min-w-0 text-right text-xs sm:block">
              <p className="max-w-[190px] truncate font-semibold text-ink-primary" title={accountName}>{accountName}</p>
              <p className="max-w-[190px] truncate text-ink-secondary" title={accountEmail}>{accountEmail}</p>
              <p className="mt-0.5 text-brand-primary">Administrador {accountLevel}</p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-info text-brand-primary group-hover:bg-brand-primary group-hover:text-white">
              <CircleUserRound size={22} aria-hidden="true" />
            </div>
          </NavLink>
        </header>
        <main id="main-content"><Outlet /></main>
      </div>
    </div>
  );
}

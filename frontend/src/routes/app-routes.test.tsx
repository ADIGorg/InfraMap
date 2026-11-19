import { isValidElement } from 'react';
import { matchRoutes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { appRoutes } from './app-routes';
import { ProtectedRoute } from './protected-route';
import { MasterRoute } from './master-route';
import { AdminOccurrencesPage } from '@/features/occurrences/pages/admin-occurrences-page';
import { AdminOccurrenceDetailPage } from '@/features/occurrences/pages/admin-occurrence-detail-page';
import { NotFoundPage } from '@/shared/pages/not-found-page';
import { AgenciesPage } from '@/features/agencies/pages/agencies-page';
import { AdminNotificationsPage } from '@/features/notifications/pages/admin-notifications-page';

vi.mock('@/config/env', () => ({ env: {
  apiBaseUrl: 'http://localhost:3000/api/v1',
  supabaseUrl: 'https://example.supabase.co',
  supabasePublishableKey: 'test-key',
} }));

function componentsAt(path: string) {
  return matchRoutes(appRoutes, path)?.map(({ route }) =>
    isValidElement(route.element) ? route.element.type : null,
  ) ?? [];
}

describe('Integração das rotas por feature', () => {
  it.each(['/login', '/forgot-password', '/confirm-recovery', '/reset-password'])(
    'mantém %s fora da guarda administrativa', path => {
      const components = componentsAt(path);
      expect(components).not.toContain(NotFoundPage);
      expect(components).not.toContain(ProtectedRoute);
      expect(components).not.toContain(MasterRoute);
    },
  );

  it.each(['/admin', '/admin/dashboard', '/admin/map', '/admin/occurrences',
    '/admin/occurrences/123', '/admin/notifications', '/admin/agencies', '/admin/admins'])(
    'mantém %s protegida', path => {
      expect(componentsAt(path)).toContain(ProtectedRoute);
    },
  );

  it('restringe a gestão de administradores também a MASTER', () => {
    expect(componentsAt('/admin/admins')).toContain(MasterRoute);
    expect(componentsAt('/admin/agencies')).not.toContain(MasterRoute);
  });

  it('resolve lista e detalhes como páginas distintas', () => {
    expect(componentsAt('/admin/occurrences').at(-1)).toBe(AdminOccurrencesPage);
    expect(componentsAt('/admin/occurrences/123').at(-1)).toBe(AdminOccurrenceDetailPage);
  });

  it('mantém o fallback para endereço desconhecido', () => {
    expect(componentsAt('/inexistente').at(-1)).toBe(NotFoundPage);
  });

  it('integra gestão de órgãos e preserva notificações implementadas', () => {
    expect(componentsAt('/admin/agencies').at(-1)).toBe(AgenciesPage);
    expect(componentsAt('/admin/notifications').at(-1)).toBe(AdminNotificationsPage);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useAdminIdentity } from '@/features/auth/hooks/use-admin-identity';
import { ProtectedRoute } from './protected-route';

vi.mock('@/features/auth/hooks/use-auth', () => ({ useAuth: vi.fn() }));
vi.mock('@/features/auth/hooks/use-admin-identity', () => ({ useAdminIdentity: vi.fn() }));

function setIdentity(data: unknown, options: { isError?: boolean; isPending?: boolean } = {}) {
  vi.mocked(useAdminIdentity).mockReturnValue({
    data,
    isLoading: Boolean(options.isPending),
    isPending: Boolean(options.isPending),
    isError: Boolean(options.isError),
  } as ReturnType<typeof useAdminIdentity>);
}
function setSession(loggedIn: boolean) {
  vi.mocked(useAuth).mockReturnValue({
    session: loggedIn ? ({ user: { id: 'admin-id' } } as Session) : null,
    isLoading: false,
    signOut: vi.fn(),
  });
}
function renderGuard() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<p>Conteúdo protegido</p>} />
        </Route>
        <Route path="/login" element={<p>Tela de login</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => { setSession(false); setIdentity(undefined); });
  it('redireciona sem sessão', () => {
    renderGuard();
    expect(screen.getByText('Tela de login')).toBeInTheDocument();
  });
  it('permite ADMIN ativo', () => {
    setSession(true);
    setIdentity({ id: 'id', role: 'ADMIN', is_active: true });
    renderGuard();
    expect(screen.getByText('Conteúdo protegido')).toBeInTheDocument();
  });
  it('bloqueia CITIZEN', () => {
    setSession(true);
    setIdentity({ id: 'id', role: 'CITIZEN', is_active: true });
    renderGuard();
    expect(screen.getByText('Acesso não autorizado')).toBeInTheDocument();
  });
  it('bloqueia ADMIN inativo', () => {
    setSession(true);
    setIdentity({ id: 'id', role: 'ADMIN', is_active: false });
    renderGuard();
    expect(screen.getByText('Acesso não autorizado')).toBeInTheDocument();
  });
  it('bloqueia quando consulta falha', () => {
    setSession(true);
    setIdentity(undefined, { isError: true });
    renderGuard();
    expect(screen.getByText('Acesso não autorizado')).toBeInTheDocument();
  });
  it('mantém tela de carregamento até validar identidade', () => {
    setSession(true);
    setIdentity(undefined, { isPending: true });
    renderGuard();
    expect(screen.getByRole('status')).toHaveTextContent('Carregando');
  });
});

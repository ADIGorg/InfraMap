import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAdminIdentity } from '@/features/auth/hooks/use-admin-identity';
import { MasterRoute } from './master-route';

vi.mock('@/features/auth/hooks/use-admin-identity', () => ({ useAdminIdentity: vi.fn() }));

function renderMaster(level?: 'MASTER' | 'OPERATIONAL') {
  vi.mocked(useAdminIdentity).mockReturnValue({
    data: { id: 'id', role: 'ADMIN', is_active: true, ...(level ? { admin_level: level } : {}) },
    isPending: false,
  } as ReturnType<typeof useAdminIdentity>);
  return render(
    <MemoryRouter initialEntries={['/admin/admins']}>
      <Routes>
        <Route element={<MasterRoute />}>
          <Route path="/admin/admins" element={<p>Gestão reservada</p>} />
        </Route>
        <Route path="/admin/dashboard" element={<p>Dashboard</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MasterRoute', () => {
  it('nega enquanto a API não fornecer admin_level', () => {
    renderMaster();
    expect(screen.getByText('Acesso não autorizado')).toBeInTheDocument();
  });
  it('nega OPERATIONAL', () => {
    renderMaster('OPERATIONAL');
    expect(screen.queryByText('Gestão reservada')).not.toBeInTheDocument();
  });
  it('permite MASTER verificado', () => {
    renderMaster('MASTER');
    expect(screen.getByText('Gestão reservada')).toBeInTheDocument();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useAdminIdentity } from '@/features/auth/hooks/use-admin-identity';
import { getAdminProfile, updateAdminProfile, changeAdminPassword } from '../services/admin-profile.service';
import { AdminProfilePage } from './admin-profile-page';

vi.mock('@/features/auth/hooks/use-auth', () => ({ useAuth: vi.fn() }));
vi.mock('@/features/auth/hooks/use-admin-identity', () => ({ useAdminIdentity: vi.fn() }));
vi.mock('../services/admin-profile.service', () => ({
  getAdminProfile: vi.fn(), updateAdminProfile: vi.fn(), changeAdminPassword: vi.fn(),
}));

const userId = '99a0a62a-87a0-4098-b523-53d1fa6b05d7';
const account = {
  id: userId, name: 'Maria Silva', phone: '(75) 99999-9999', email: 'maria@example.com',
  created_at: '2026-11-01T10:00:00Z', updated_at: '2026-11-01T10:00:00Z',
};

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter><AdminProfilePage /></MemoryRouter></QueryClientProvider>);
  return client;
}

beforeEach(() => {
  vi.mocked(getAdminProfile).mockReset();
  vi.mocked(updateAdminProfile).mockReset();
  vi.mocked(changeAdminPassword).mockReset();
  vi.mocked(getAdminProfile).mockResolvedValue({ ...account });
  vi.mocked(updateAdminProfile).mockImplementation(async changes => ({ ...account, ...changes }));
  vi.mocked(changeAdminPassword).mockResolvedValue(undefined);
  vi.mocked(useAuth).mockReturnValue({
    session: { user: { email: account.email } }, isLoading: false, signOut: vi.fn(),
  } as unknown as ReturnType<typeof useAuth>);
  vi.mocked(useAdminIdentity).mockReturnValue({
    data: { id: userId, role: 'ADMIN', is_active: true, admin_level: 'OPERATIONAL' },
  } as ReturnType<typeof useAdminIdentity>);
});

describe('AdminProfilePage', () => {
  it('identifica conta autenticada sem editar e-mail ou nível', async () => {
    mount();
    expect(await screen.findByRole('heading', { name: 'Maria Silva' })).toBeInTheDocument();
    expect(screen.getAllByText('maria@example.com').length).toBeGreaterThan(0);
    expect(screen.getByText('Administrador Operacional')).toBeInTheDocument();
    expect(screen.getByText('Sessão autenticada')).toBeInTheDocument();
    expect(screen.getByText('Conta conectada')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Editar dados' }));
    expect(screen.getByLabelText('Nome completo')).toBeInTheDocument();
    expect(screen.queryByLabelText('E-mail de acesso')).not.toBeInTheDocument();
  });

  it('edita nome e telefone utilizando a API existente', async () => {
    mount();
    await screen.findByRole('heading', { name: 'Maria Silva' });
    fireEvent.click(screen.getByRole('button', { name: 'Editar dados' }));
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Maria Souza' } });
    fireEvent.change(screen.getByLabelText('Telefone (opcional)'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(() => expect(updateAdminProfile).toHaveBeenCalledWith({ name: 'Maria Souza', phone: null }));
    expect(await screen.findByRole('heading', { name: 'Maria Souza' })).toBeInTheDocument();
    expect(screen.getByText('Seus dados foram atualizados com sucesso.')).toBeInTheDocument();
  });

  it('troca senha sem guardar credenciais no cache de perfil', async () => {
    const client = mount();
    await screen.findByRole('heading', { name: 'Maria Silva' });
    fireEvent.click(screen.getByRole('button', { name: 'Alterar minha senha' }));
    fireEvent.change(screen.getByLabelText('Senha atual'), { target: { value: 'atual12345' } });
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'nova12345678' } });
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: 'nova12345678' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar nova senha' }));
    await waitFor(() => expect(changeAdminPassword).toHaveBeenCalledWith('atual12345', 'nova12345678'));
    expect(await screen.findByText(/Senha alterada com sucesso/)).toBeInTheDocument();
    expect(JSON.stringify(client.getQueryData(['admin', 'account-profile']))).not.toContain('nova12345678');
  });

  it('mostra e oculta cada senha de maneira independente, como no login', async () => {
    mount();
    await screen.findByRole('heading', { name: 'Maria Silva' });
    fireEvent.click(screen.getByRole('button', { name: 'Alterar minha senha' }));

    const current = screen.getByLabelText('Senha atual');
    const next = screen.getByLabelText('Nova senha');
    const confirmation = screen.getByLabelText('Confirmar nova senha');
    expect(current).toHaveAttribute('type', 'password');
    expect(next).toHaveAttribute('type', 'password');
    expect(confirmation).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar senha atual' }));
    expect(current).toHaveAttribute('type', 'text');
    expect(next).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Ocultar senha atual' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar nova senha' }));
    expect(next).toHaveAttribute('type', 'text');
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar confirmação da nova senha' }));
    expect(confirmation).toHaveAttribute('type', 'text');

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar senha atual' }));
    expect(current).toHaveAttribute('type', 'password');
    expect(next).toHaveAttribute('type', 'text');

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Alterar minha senha' }));
    expect(screen.getByLabelText('Senha atual')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Nova senha')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Confirmar nova senha')).toHaveAttribute('type', 'password');
  });

  it('mudar a visibilidade nao envia o formulario de alteracao de senha', async () => {
    mount();
    await screen.findByRole('heading', { name: 'Maria Silva' });
    fireEvent.click(screen.getByRole('button', { name: 'Alterar minha senha' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar senha atual' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar nova senha' }));
    expect(changeAdminPassword).not.toHaveBeenCalled();
  });

});

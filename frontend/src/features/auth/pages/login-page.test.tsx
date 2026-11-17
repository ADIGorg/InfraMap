import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { signInAdmin, signOutAdmin } from '../services/auth.service';
import { getAdminIdentity } from '../services/admin-identity.service';
import { LoginPage } from './login-page';

vi.mock('../services/auth.service', () => ({
  signInAdmin: vi.fn(),
  signOutAdmin: vi.fn(),
}));
vi.mock('../services/admin-identity.service', () => ({
  getAdminIdentity: vi.fn(),
}));

function renderLogin(path = '/login') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/dashboard" element={<p>Painel autorizado</p>} />
      </Routes>
    </MemoryRouter>,
  );
}
function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText('E-mail institucional'), { target: { value: 'ADMIN@INSTITUICAO.COM' } });
  fireEvent.change(screen.getByLabelText('Senha de acesso'), { target: { value: 'senha-de-teste-123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Entrar no Painel' }));
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.mocked(signInAdmin).mockResolvedValue(undefined);
    vi.mocked(signOutAdmin).mockResolvedValue(undefined);
    vi.mocked(getAdminIdentity).mockResolvedValue({
      id: '10101010-1010-4010-8010-101010101010',
      role: 'ADMIN',
      is_active: true,
    });
  });

  it('não preenche e-mail ou senha automaticamente pelo aplicativo', () => {
    renderLogin();
    expect(screen.getByLabelText('E-mail institucional')).toHaveValue('');
    expect(screen.getByLabelText('Senha de acesso')).toHaveValue('');
    expect(screen.getByLabelText('Senha de acesso')).toHaveAttribute('type', 'password');
  });

  it('ADMIN ativo entra no painel com identidade verificada', async () => {
    renderLogin();
    fillAndSubmit();
    expect(await screen.findByText('Painel autorizado')).toBeInTheDocument();
    expect(signInAdmin).toHaveBeenCalledWith('ADMIN@INSTITUICAO.COM', 'senha-de-teste-123');
    expect(getAdminIdentity).toHaveBeenCalledTimes(1);
  });

  it('credenciais inválidas não permitem navegação e mostram mensagem genérica', async () => {
    vi.mocked(signInAdmin).mockRejectedValue(new Error('Invalid login'));
    renderLogin();
    fillAndSubmit();
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos');
    expect(screen.queryByText('Painel autorizado')).not.toBeInTheDocument();
    expect(signOutAdmin).toHaveBeenCalledTimes(1);
  });

  it('ADMIN inativo não recebe dashboard', async () => {
    vi.mocked(getAdminIdentity).mockResolvedValue({
      id: '10101010-1010-4010-8010-101010101010',
      role: 'ADMIN',
      is_active: false,
    });
    renderLogin();
    fillAndSubmit();
    expect(await screen.findByRole('alert')).toHaveTextContent('não autorizado');
    expect(screen.queryByText('Painel autorizado')).not.toBeInTheDocument();
  });

  it('não abre domínio externo informado em returnTo', async () => {
    renderLogin('/login?returnTo=https%3A%2F%2Fevil.example');
    fillAndSubmit();
    expect(await screen.findByText('Painel autorizado')).toBeInTheDocument();
  });

  it('evita clique repetido durante consulta pendente', async () => {
    let done: (() => void) | undefined;
    vi.mocked(signInAdmin).mockImplementation(() => new Promise<void>((resolve) => { done = resolve; }));
    renderLogin();
    fillAndSubmit();
    fireEvent.click(screen.getByRole('button', { name: 'Entrar no Painel' }));
    expect(signInAdmin).toHaveBeenCalledTimes(1);
    done?.();
    await waitFor(() => expect(screen.getByText('Painel autorizado')).toBeInTheDocument());
  });
});


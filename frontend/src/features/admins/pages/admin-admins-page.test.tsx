import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http } from '@/infrastructure/api/http-client';
import { AppError } from '@/shared/errors/app-error';
import { AdminAdminsPage } from './admin-admins-page';

vi.mock('@/infrastructure/api/http-client', () => ({ http: vi.fn() }));
const id = '10000000-0000-4000-8000-000000000001';
const secondId = '20000000-0000-4000-8000-000000000002';
const master = { id, name: 'Maria', admin_level: 'MASTER', is_active: true, created_by: null };
const operator = { ...master, id: secondId, name: 'João', admin_level: 'OPERATIONAL' };
let identity: Record<string, unknown>;
let rows: typeof master[];
const clients: QueryClient[] = [];
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  render(<QueryClientProvider client={client}><MemoryRouter><AdminAdminsPage /></MemoryRouter></QueryClientProvider>);
  return client;
}
function fill() {
  fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Ana' } });
  fireEvent.change(screen.getByLabelText('E-mail institucional'), { target: { value: 'ana@example.com' } });
  fireEvent.change(screen.getByLabelText('Senha inicial'), { target: { value: 'test-password-123' } });
}
beforeEach(() => {
  identity = { id, role: 'ADMIN', is_active: true, admin_level: 'MASTER' };
  rows = [master, operator];
  vi.mocked(http).mockReset();
  vi.mocked(http).mockImplementation(async (path, options) => {
    if (path === '/admin/me') return identity;
    if (path === '/admin/admins' && !options?.method) return { data: rows };
    if (options?.method === 'POST') return { data: { ...operator, name: 'Ana' } };
    if (options?.method === 'PATCH') return { data: { ...operator, ...options.body as object } };
    throw new Error('Unexpected request');
  });
});
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); });

describe('Gestão de administradores MASTER', () => {
  it.each([
    { role: 'ADMIN', is_active: true, admin_level: 'OPERATIONAL' },
    { role: 'CITIZEN', is_active: true },
    { role: 'ADMIN', is_active: false, admin_level: 'MASTER' },
    { role: 'ADMIN', is_active: true },
  ])('bloqueia identidade sem MASTER ativo: %j', async data => {
    identity = { id, ...data };
    mount();
    expect(await screen.findByText('Acesso não autorizado')).toBeInTheDocument();
    expect(vi.mocked(http).mock.calls.every(([path]) => path === '/admin/me')).toBe(true);
  });

  it('cria conta com contrato correto e limpa senha sem guardá-la no cache', async () => {
    const client = mount();
    await screen.findByText('João');
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar administrador' }));
    await screen.findByText('Administrador cadastrado com sucesso.');
    expect(http).toHaveBeenCalledWith('/admin/admins', { method: 'POST', body: {
      name: 'Ana', email: 'ana@example.com', password: 'test-password-123', admin_level: 'OPERATIONAL',
    } });
    expect(screen.getByLabelText('Senha inicial')).toHaveValue('');
    expect(client.getMutationCache().getAll()).toHaveLength(0);
    expect(JSON.stringify(client.getQueriesData({}))).not.toContain('test-password-123');
  });

  it('valida campos sem enviar criação inválida', async () => {
    mount(); await screen.findByText('João');
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar administrador' }));
    expect(await screen.findByText('Informe o nome.')).toBeInTheDocument();
    expect(screen.getByText('Use pelo menos 8 caracteres.')).toBeInTheDocument();
    expect(vi.mocked(http).mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
  });

  it('trata duplicidade sem repetir a criação nem manter senha', async () => {
    mount(); await screen.findByText('João'); fill();
    vi.mocked(http).mockImplementation(async (path, options) => {
      if (options?.method === 'POST') throw new AppError(409, 'CONFLICT', 'Duplicate');
      return path === '/admin/me' ? identity : { data: rows };
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar administrador' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe uma conta');
    await waitFor(() => expect(screen.getByLabelText('Senha inicial')).toHaveValue(''));
    expect(vi.mocked(http).mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(1);
  });

  it('protege o último Master e exige confirmação para promover', async () => {
    mount(); await screen.findByText('João');
    expect(screen.getByRole('button', { name: 'Desativar Maria' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Alterar perfil de Maria' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Alterar perfil de João' }));
    expect(vi.mocked(http).mock.calls.some(([, options]) => options?.method === 'PATCH')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await screen.findByText('Administrador atualizado com sucesso.');
    expect(http).toHaveBeenCalledWith('/admin/admins/' + secondId, { method: 'PATCH', body: { admin_level: 'MASTER' } });
  });

  it('trata conflito concorrente do último Master e recarrega a lista', async () => {
    rows = [master, { ...operator, admin_level: 'MASTER' }];
    mount(); await screen.findByText('João');
    vi.mocked(http).mockImplementation(async (path, options) => {
      if (options?.method === 'PATCH') { rows = [master]; throw new AppError(409, 'CONFLICT', 'Last master'); }
      return path === '/admin/me' ? identity : { data: rows };
    });
    fireEvent.click(screen.getByRole('button', { name: 'Desativar Maria' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('último MASTER ativo');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Desativar Maria' })).toBeDisabled());
  });

  it.each([true, false])('altera situação de conta com is_active=%s após confirmação', async active => {
    rows = [master, { ...operator, is_active: active }];
    mount(); await screen.findByText('João');
    fireEvent.click(screen.getByRole('button', { name: `${active ? 'Desativar' : 'Ativar'} João` }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await screen.findByText('Administrador atualizado com sucesso.');
    expect(http).toHaveBeenCalledWith('/admin/admins/' + secondId, { method: 'PATCH', body: { is_active: !active } });
  });

  it('revalida identidade antes de escrever e bloqueia revogação durante uso', async () => {
    mount(); await screen.findByText('João'); fill();
    identity = { ...identity, admin_level: 'OPERATIONAL' };
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar administrador' }));
    expect(await screen.findByText('Acesso não autorizado')).toBeInTheDocument();
    expect(vi.mocked(http).mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
  });

  it('bloqueia a tela quando a API recusa uma alteração com 403', async () => {
    mount(); await screen.findByText('João');
    vi.mocked(http).mockImplementation(async (path, options) => {
      if (options?.method === 'PATCH') throw new AppError(403, 'FORBIDDEN', 'Revoked');
      return path === '/admin/me' ? identity : { data: rows };
    });
    fireEvent.click(screen.getByRole('button', { name: 'Desativar João' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText('Acesso não autorizado')).toBeInTheDocument();
    expect(screen.queryByText('João')).not.toBeInTheDocument();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http } from '@/infrastructure/api/http-client';
import { supabase } from '@/infrastructure/api/supabase-client';
import { changeAdminPassword, getAdminProfile, updateAdminProfile } from './admin-profile.service';

vi.mock('@/infrastructure/api/http-client', () => ({ http: vi.fn() }));
vi.mock('@/infrastructure/api/supabase-client', () => ({
  supabase: { auth: { getUser: vi.fn(), signInWithPassword: vi.fn(), updateUser: vi.fn() } },
}));

const userId = '99a0a62a-87a0-4098-b523-53d1fa6b05d7';
const account = {
  id: userId, name: 'Maria Silva', phone: null, email: 'maria@example.com',
  created_at: '2026-11-01T10:00:00Z', updated_at: '2026-11-01T10:00:00Z',
};

describe('serviço do perfil administrativo', () => {
  beforeEach(() => {
    vi.mocked(http).mockReset();
    vi.mocked(supabase.auth.getUser).mockReset();
    vi.mocked(supabase.auth.signInWithPassword).mockReset();
    vi.mocked(supabase.auth.updateUser).mockReset();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: userId, email: account.email } }, error: null,
    } as never);
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: { id: userId, email: account.email } }, error: null,
    } as never);
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({ data: {}, error: null } as never);
  });

  it('lê e valida o envelope GET /identity/me', async () => {
    vi.mocked(http).mockResolvedValue({ message: 'Usuário autenticado.', data: account });
    await expect(getAdminProfile()).resolves.toEqual(account);
    expect(http).toHaveBeenCalledWith('/identity/me');
  });

  it('edita apenas nome e telefone pelo PATCH já existente', async () => {
    vi.mocked(http).mockResolvedValue({ data: { ...account, name: 'Maria Souza' } });
    await expect(updateAdminProfile({ name: 'Maria Souza', phone: null })).resolves.toMatchObject({ name: 'Maria Souza' });
    expect(http).toHaveBeenCalledWith('/identity/me', {
      method: 'PATCH', body: { name: 'Maria Souza', phone: null },
    });
  });

  it('rejeita contrato de resposta incompleto', async () => {
    vi.mocked(http).mockResolvedValue({ data: { name: 'Sem identificador' } });
    await expect(getAdminProfile()).rejects.toBeDefined();
  });

  it('valida senha atual e atualiza pelo Supabase Auth sem usar Express', async () => {
    await changeAdminPassword('senha-atual', 'senha-nova1234');
    expect(supabase.auth.getUser).toHaveBeenCalledTimes(1);
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'maria@example.com', password: 'senha-atual',
    });
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'senha-nova1234' });
    expect(http).not.toHaveBeenCalled();
  });

  it('impede atualização quando senha atual é inválida', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({ data: {}, error: { status: 400 } } as never);
    await expect(changeAdminPassword('errada', 'outra-nova123')).rejects.toMatchObject({
      code: 'CURRENT_PASSWORD_MISMATCH',
    });
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it('impede atualização quando sessão não está autenticada', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null }, error: null } as never);
    await expect(changeAdminPassword('senha', 'outra-nova123')).rejects.toMatchObject({ statusCode: 401 });
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('impede atualização em caso de incompatibilidade da identidade', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: { id: 'outro-id' } }, error: null,
    } as never);
    await expect(changeAdminPassword('senha', 'outra-nova123')).rejects.toMatchObject({ statusCode: 401 });
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it('não expõe detalhes técnicos de erro no updateUser', async () => {
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({
      data: {}, error: { status: 400, message: 'internal error' },
    } as never);
    await expect(changeAdminPassword('senha', 'outra-nova123')).rejects.toMatchObject({
      code: 'PASSWORD_UPDATE_FAILED',
    });
  });
});

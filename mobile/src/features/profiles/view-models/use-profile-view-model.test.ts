import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useProfileViewModel } from './use-profile-view-model';
import * as ProfileService from '../services/profile.service';
import * as AccountService from '../services/account.service';
import * as AuthService from '@/features/auth/services/auth.service';
import { queryClient } from '@/infrastructure/query-client';
import { supabase } from '@/infrastructure/api/supabase-auth';
import { AppError } from '@/shared/errors/app-error';
import type { AccountProfile } from '@/shared/types/api';

jest.mock('../services/profile.service');
jest.mock('../services/account.service');
jest.mock( '@/features/auth/services/auth.service', () => ({ 
  changePassword: jest.fn(), 
}), );
jest.mock('@/infrastructure/query-client', () => ({
  queryClient: { clear: jest.fn() },
}));
jest.mock('@/infrastructure/api/supabase-auth', () => ({
  supabase: { auth: { signOut: jest.fn() } },
}));

const makeProfile = (overrides: Partial<AccountProfile> = {}): AccountProfile => ({
  id: 'user-1',
  name: 'João Silva',
  phone: '11999999999',
  email: 'joao@teste.com',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('useProfileViewModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ProfileService.getMyProfile as jest.Mock).mockResolvedValue(makeProfile());
  });

  // ─── Carregamento ───
  it('carrega perfil no mount', async () => {
    const { result } = await renderHook(() => useProfileViewModel());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.profile?.name).toBe('João Silva');
    expect(result.current.loadError).toBeNull();
  });

  it('expõe mensagem de erro quando load falha', async () => {
    (ProfileService.getMyProfile as jest.Mock).mockRejectedValueOnce(
      new AppError(500, 'ERR', 'Falha ao carregar.'),
    );
    const { result } = await renderHook(() => useProfileViewModel());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.loadError).toBe('Falha ao carregar.');
    expect(result.current.profile).toBeNull();
  });

  // ─── Edição ───
  it('openEdit popula nome e telefone atuais', async () => {
    const { result } = await renderHook(() => useProfileViewModel());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.openEdit();
    });

    expect(result.current.isEditOpen).toBe(true);
    expect(result.current.editName).toBe('João Silva');
    expect(result.current.editPhone).toBe('11999999999');
  });

  it('submitEdit bloqueia nome curto sem chamar service', async () => {
    const { result } = await renderHook(() => useProfileViewModel());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Fase 1: abrir + setar nome inválido
    await act(async () => {
      result.current.openEdit();
      result.current.setEditName('Jo');
    });

    // Fase 2: submit lê o estado atualizado
    await act(async () => {
      await result.current.submitEdit();
    });

    expect(result.current.editErrors.name).toBeTruthy();
    expect(ProfileService.updateMyProfile).not.toHaveBeenCalled();
  });

  it('submitEdit envia apenas nome e telefone — e-mail nunca vai ao service', async () => {
    (ProfileService.updateMyProfile as jest.Mock).mockResolvedValueOnce(
      makeProfile({ name: 'João Silva Santos', phone: null }),
    );
    const { result } = await renderHook(() => useProfileViewModel());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Fase 1: abrir + preencher
    await act(async () => {
      result.current.openEdit();
      result.current.setEditName('João Silva Santos');
      result.current.setEditPhone('');
    });

    // Fase 2: submit
    await act(async () => {
      await result.current.submitEdit();
    });

    expect(ProfileService.updateMyProfile).toHaveBeenCalledWith({
      name: 'João Silva Santos',
      phone: null,
    });
    const callArgs = (ProfileService.updateMyProfile as jest.Mock).mock.calls[0][0];
    expect(callArgs).not.toHaveProperty('email');
    expect(result.current.isEditOpen).toBe(false);
    expect(result.current.profile?.name).toBe('João Silva Santos');
  });

  it('submitEdit mantém modal aberto em erro de service', async () => {
    (ProfileService.updateMyProfile as jest.Mock).mockRejectedValueOnce(
      new AppError(400, 'ERR', 'Erro ao salvar.'),
    );
    const { result } = await renderHook(() => useProfileViewModel());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.openEdit();
    });

    await act(async () => {
      await result.current.submitEdit();
    });

    expect(result.current.editErrors.general).toBe('Erro ao salvar.');
    expect(result.current.isEditOpen).toBe(true);
  });

  // ─── Senha ───
  it(
  'submitPassword bloqueia quando a senha atual não foi informada',
  async () => {
    const { result } = await renderHook(
      () => useProfileViewModel(),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      result.current.openPassword();
      result.current.setNewPassword('novaSenha123');
      result.current.setConfirmPassword('novaSenha123');
    });

    await act(async () => {
      await result.current.submitPassword();
    });

    expect(
      result.current.passwordErrors.currentPassword,
    ).toBe('Informe sua senha atual');

    expect(AuthService.changePassword).not.toHaveBeenCalled();
    expect(result.current.isPasswordOpen).toBe(true);
  },
);

it(
  'submitPassword bloqueia senhas divergentes',
  async () => {
    const { result } = await renderHook(
      () => useProfileViewModel(),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      result.current.openPassword();
      result.current.setCurrentPassword('senhaAtual123');
      result.current.setNewPassword('senhaNova123');
      result.current.setConfirmPassword('outraSenha123');
    });

    await act(async () => {
      await result.current.submitPassword();
    });

    expect(
      result.current.passwordErrors.confirmPassword,
    ).toBe('Senhas não coincidem');

    expect(AuthService.changePassword).not.toHaveBeenCalled();
  },
);

it(
  'submitPassword bloqueia nova senha igual à senha atual',
  async () => {
    const { result } = await renderHook(
      () => useProfileViewModel(),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      result.current.openPassword();
      result.current.setCurrentPassword('mesmaSenha123');
      result.current.setNewPassword('mesmaSenha123');
      result.current.setConfirmPassword('mesmaSenha123');
    });

    await act(async () => {
      await result.current.submitPassword();
    });

    expect(
      result.current.passwordErrors.newPassword,
    ).toBe('A nova senha deve ser diferente da senha atual');

    expect(AuthService.changePassword).not.toHaveBeenCalled();
  },
);

it(
  'submitPassword mostra erro no campo quando a senha atual está incorreta',
  async () => {
    (
      AuthService.changePassword as jest.Mock
    ).mockRejectedValueOnce(
      new AppError(
        400,
        'CURRENT_PASSWORD_MISMATCH',
        'A senha atual está incorreta.',
      ),
    );

    const { result } = await renderHook(
      () => useProfileViewModel(),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      result.current.openPassword();
      result.current.setCurrentPassword('senhaErrada123');
      result.current.setNewPassword('novaSenha123');
      result.current.setConfirmPassword('novaSenha123');
    });

    await act(async () => {
      await result.current.submitPassword();
    });

    expect(AuthService.changePassword).toHaveBeenCalledWith(
      'senhaErrada123',
      'novaSenha123',
    );

    expect(
      result.current.passwordErrors.currentPassword,
    ).toBe('A senha atual está incorreta.');

    expect(
      result.current.passwordErrors.general,
    ).toBeUndefined();

    expect(result.current.isPasswordOpen).toBe(true);
    expect(result.current.passwordSuccess).toBe(false);
    expect(result.current.isChangingPassword).toBe(false);
  },
);

it(
  'submitPassword exibe erro geral quando o serviço falha',
  async () => {
    (
     AuthService.changePassword as jest.Mock
    ).mockRejectedValueOnce(
      new AppError(
        500,
        'PASSWORD_UPDATE_FAILED',
        'Não foi possível alterar a senha.',
      ),
    );

    const { result } = await renderHook(
      () => useProfileViewModel(),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      result.current.openPassword();
      result.current.setCurrentPassword('senhaAtual123');
      result.current.setNewPassword('novaSenha123');
      result.current.setConfirmPassword('novaSenha123');
    });

    await act(async () => {
      await result.current.submitPassword();
    });

    expect(
      result.current.passwordErrors.general,
    ).toBe('Não foi possível alterar a senha.');

    expect(result.current.isPasswordOpen).toBe(true);
    expect(result.current.passwordSuccess).toBe(false);
  },
);

it(
  'submitPassword envia senha atual e nova senha ao serviço',
  async () => {
    (
      AuthService.changePassword as jest.Mock
    ).mockResolvedValueOnce(undefined);

    const { result } = await renderHook(
      () => useProfileViewModel(),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      result.current.openPassword();
      result.current.setCurrentPassword('senhaAtual123');
      result.current.setNewPassword('novaSenha123');
      result.current.setConfirmPassword('novaSenha123');
    });

    await act(async () => {
      await result.current.submitPassword();
    });

    expect(AuthService.changePassword).toHaveBeenCalledTimes(1);

    expect(AuthService.changePassword).toHaveBeenCalledWith(
      'senhaAtual123',
      'novaSenha123',
    );

    expect(result.current.passwordSuccess).toBe(true);
    expect(result.current.passwordErrors).toEqual({});
    expect(result.current.currentPassword).toBe('');
    expect(result.current.newPassword).toBe('');
    expect(result.current.confirmPassword).toBe('');
  },
);

it(
  'openPassword limpa os campos e erros anteriores',
  async () => {
    const { result } = await renderHook(
      () => useProfileViewModel(),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      result.current.openPassword();
      result.current.setCurrentPassword('senhaAtual123');
      result.current.setNewPassword('novaSenha123');
      result.current.setConfirmPassword('outraSenha123');
    });

    await act(async () => {
      await result.current.submitPassword();
    });

    expect(
      result.current.passwordErrors.confirmPassword,
    ).toBe('Senhas não coincidem');

    await act(async () => {
      result.current.closePassword();
      result.current.openPassword();
    });

    expect(result.current.currentPassword).toBe('');
    expect(result.current.newPassword).toBe('');
    expect(result.current.confirmPassword).toBe('');
    expect(result.current.passwordErrors).toEqual({});
    expect(result.current.passwordSuccess).toBe(false);
  },
);
  // ─── Exclusão ───
  it('confirmDelete sem acknowledged não faz nada', async () => {
    const { result } = await renderHook(() => useProfileViewModel());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.openDelete();
    });

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(AccountService.deleteMyAccount).not.toHaveBeenCalled();
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });

  it('confirmDelete com acknowledged limpa cache e desloga', async () => {
    (AccountService.deleteMyAccount as jest.Mock).mockResolvedValueOnce({
      pendingAuthCleanup: false,
    });
    (supabase.auth.signOut as jest.Mock).mockResolvedValueOnce(undefined);
    const { result } = await renderHook(() => useProfileViewModel());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.openDelete();
      result.current.setDeleteAcknowledged(true);
    });

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(AccountService.deleteMyAccount).toHaveBeenCalledTimes(1);
    expect(queryClient.clear).toHaveBeenCalledTimes(1);
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
  });

  // ─── Logout ───
  it('confirmLogout limpa cache e desloga', async () => {
    (supabase.auth.signOut as jest.Mock).mockResolvedValueOnce(undefined);
    const { result } = await renderHook(() => useProfileViewModel());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.openLogout();
    });

    await act(async () => {
      await result.current.confirmLogout();
    });

    expect(queryClient.clear).toHaveBeenCalledTimes(1);
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
  });

  // ─── Reentrada com conta diferente ───
  it('nova montagem após logout carrega o novo usuário', async () => {
    (ProfileService.getMyProfile as jest.Mock)
      .mockResolvedValueOnce(makeProfile({ id: 'u1', name: 'João' }))
      .mockResolvedValueOnce(makeProfile({ id: 'u2', name: 'Maria', email: 'maria@teste.com' }));

    const first = await renderHook(() => useProfileViewModel());
    await waitFor(() => expect(first.result.current.profile?.name).toBe('João'));

    await act(async () => {
      first.result.current.openLogout();
    });

    await act(async () => {
      await first.result.current.confirmLogout();
    });

    first.unmount();

    const second = await renderHook(() => useProfileViewModel());
    await waitFor(() => expect(second.result.current.profile?.name).toBe('Maria'));
    expect(second.result.current.profile?.email).toBe('maria@teste.com');
  });
});
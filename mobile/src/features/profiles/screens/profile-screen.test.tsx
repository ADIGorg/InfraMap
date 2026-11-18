import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProfileScreen } from './profile-screen';
import * as VM from '../view-models/use-profile-view-model';

jest.mock('../view-models/use-profile-view-model', () => ({
  useProfileViewModel: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

const makeProfile = () => ({
  id: 'user-1',
  name: 'João Silva',
  phone: '11999999999',
  email: 'joao@teste.com',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

const baseVM = {
  profile: makeProfile(),
  isLoading: false,
  loadError: null,
  reload: jest.fn(),
  isEditOpen: false,
  editName: '',
  setEditName: jest.fn(),
  editPhone: '',
  setEditPhone: jest.fn(),
  editErrors: {},
  isSaving: false,
  openEdit: jest.fn(),
  closeEdit: jest.fn(),
  submitEdit: jest.fn(),
  clearEditError: jest.fn(),
  isPasswordOpen: false,
  newPassword: '',
  setNewPassword: jest.fn(),
  confirmPassword: '',
  setConfirmPassword: jest.fn(),
  passwordErrors: {},
  isChangingPassword: false,
  passwordSuccess: false,
  openPassword: jest.fn(),
  closePassword: jest.fn(),
  submitPassword: jest.fn(),
  clearPasswordError: jest.fn(),
  isDeleteOpen: false,
  deleteAcknowledged: false,
  setDeleteAcknowledged: jest.fn(),
  isDeleting: false,
  deleteError: null,
  openDelete: jest.fn(),
  closeDelete: jest.fn(),
  confirmDelete: jest.fn(),
  isLogoutOpen: false,
  isLoggingOut: false,
  openLogout: jest.fn(),
  closeLogout: jest.fn(),
  confirmLogout: jest.fn(),
};

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renderiza nome, e-mail e ações principais', async () => {
    (VM.useProfileViewModel as jest.Mock).mockReturnValue(baseVM);
    const { getByText } = await render(<ProfileScreen />);

    expect(getByText('João Silva')).toBeTruthy();
    expect(getByText('joao@teste.com')).toBeTruthy();
    expect(getByText('Editar nome e telefone')).toBeTruthy();
    expect(getByText('Alterar senha')).toBeTruthy();
    expect(getByText('Excluir conta')).toBeTruthy();
    expect(getByText('Sair da Conta')).toBeTruthy();
  });

  it('não exibe "Editar nome e e-mail" (divergência de imagem tratada)', async () => {
    (VM.useProfileViewModel as jest.Mock).mockReturnValue(baseVM);
    const { queryByText } = await render(<ProfileScreen />);
    expect(queryByText('Editar nome e e-mail')).toBeNull();
  });

  it('não exibe role nem admin_level na tela', async () => {
    (VM.useProfileViewModel as jest.Mock).mockReturnValue(baseVM);
    const { queryByText } = await render(<ProfileScreen />);
    expect(queryByText(/ADMIN/i)).toBeNull();
    expect(queryByText(/MASTER/i)).toBeNull();
    expect(queryByText(/role/i)).toBeNull();
  });

  it('loading exibe spinner (sem perfil ainda)', async () => {
    (VM.useProfileViewModel as jest.Mock).mockReturnValue({
      ...baseVM,
      isLoading: true,
      profile: null,
    });
    const { queryByText } = await render(<ProfileScreen />);
    expect(queryByText('João Silva')).toBeNull();
  });

  it('erro de load exibe mensagem e botão retry', async () => {
    const reload = jest.fn();
    (VM.useProfileViewModel as jest.Mock).mockReturnValue({
      ...baseVM,
      profile: null,
      loadError: 'Falha ao carregar.',
      reload,
    });
    const { getByText } = await render(<ProfileScreen />);

    expect(getByText('Falha ao carregar.')).toBeTruthy();
    await fireEvent.press(getByText('Tentar novamente'));
    expect(reload).toHaveBeenCalled();
  });

  it('tocar em Editar chama openEdit', async () => {
    const openEdit = jest.fn();
    (VM.useProfileViewModel as jest.Mock).mockReturnValue({
      ...baseVM,
      openEdit,
    });
    const { getByLabelText } = await render(<ProfileScreen />);
    await fireEvent.press(getByLabelText('Editar nome e telefone'));
    expect(openEdit).toHaveBeenCalled();
  });

  it('tocar em Alterar senha chama openPassword', async () => {
    const openPassword = jest.fn();
    (VM.useProfileViewModel as jest.Mock).mockReturnValue({
      ...baseVM,
      openPassword,
    });
    const { getByLabelText } = await render(<ProfileScreen />);
    await fireEvent.press(getByLabelText('Alterar senha'));
    expect(openPassword).toHaveBeenCalled();
  });

  it('tocar em Excluir conta chama openDelete', async () => {
    const openDelete = jest.fn();
    (VM.useProfileViewModel as jest.Mock).mockReturnValue({
      ...baseVM,
      openDelete,
    });
    const { getByLabelText } = await render(<ProfileScreen />);
    await fireEvent.press(getByLabelText('Excluir conta'));
    expect(openDelete).toHaveBeenCalled();
  });

  it('tocar em Sair da Conta chama openLogout', async () => {
    const openLogout = jest.fn();
    (VM.useProfileViewModel as jest.Mock).mockReturnValue({
      ...baseVM,
      openLogout,
    });
    const { getByLabelText } = await render(<ProfileScreen />);
    await fireEvent.press(getByLabelText('Sair da conta'));
    expect(openLogout).toHaveBeenCalled();
  });

  it('modal de exclusão aberto exibe aviso de retenção das ocorrências', async () => {
    (VM.useProfileViewModel as jest.Mock).mockReturnValue({
      ...baseVM,
      isDeleteOpen: true,
    });
    const { getByText } = await render(<ProfileScreen />);
    expect(getByText(/rastreabilidade urbana/i)).toBeTruthy();
    expect(getByText('Sim, excluir minha conta')).toBeTruthy();
  });

  it('modal de exclusão com checkbox desmarcado mantém botão de confirmar desabilitado', async () => {
    const confirmDelete = jest.fn();
    (VM.useProfileViewModel as jest.Mock).mockReturnValue({
      ...baseVM,
      isDeleteOpen: true,
      deleteAcknowledged: false,
      confirmDelete,
    });
    const { getByLabelText } = await render(<ProfileScreen />);
    await fireEvent.press(getByLabelText('Excluir minha conta'));
    expect(confirmDelete).not.toHaveBeenCalled();
  });
});
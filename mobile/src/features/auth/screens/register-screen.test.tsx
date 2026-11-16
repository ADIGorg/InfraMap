import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { RegisterScreen } from './register-screen';
import * as AuthService from '@/features/auth/services/auth.service';
import { useNavigation } from '@react-navigation/native';
import { AppError } from '@/shared/errors/app-error';

jest.mock('@react-navigation/native', () => ({ useNavigation: jest.fn() }));
jest.mock('@/features/auth/services/auth.service', () => ({
  signup: jest.fn(),
  validateCitizenIdentity: jest.fn(),
  logout: jest.fn(),
  resendConfirmationEmail: jest.fn(),
}));

describe('RegisterScreen', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as any).mockReturnValue({ navigate: mockNavigate });
  });

  const fillValidForm = async (utils: any) => {
    await fireEvent.changeText(
      utils.getByPlaceholderText('Digite seu nome completo'),
      'João Silva',
    );
    await fireEvent.changeText(
      utils.getByPlaceholderText('exemplo@email.com'),
      'joao@teste.com',
    );
    await fireEvent.changeText(
      utils.getByPlaceholderText('Crie uma senha forte'),
      'senha12345',
    );
    await fireEvent.changeText(
      utils.getByPlaceholderText('Digite a senha novamente'),
      'senha12345',
    );
  };

  it('renderiza todos os campos obrigatórios', async () => {
    const utils = await render(<RegisterScreen />);
    expect(utils.getByPlaceholderText('Digite seu nome completo')).toBeTruthy();
    expect(utils.getByPlaceholderText('exemplo@email.com')).toBeTruthy();
    expect(utils.getByPlaceholderText('Crie uma senha forte')).toBeTruthy();
    expect(utils.getByPlaceholderText('Digite a senha novamente')).toBeTruthy();
    expect(utils.getByText('Cada e-mail só pode ser usado uma vez.')).toBeTruthy();
  });

    it('e-mail inválido bloqueia envio', async () => {
    const utils = await render(<RegisterScreen />);
    await fillValidForm(utils);
    await fireEvent.press(utils.getByRole('checkbox'));
    await fireEvent.changeText(utils.getByPlaceholderText('exemplo@email.com'), 'invalido');
    await fireEvent.press(utils.getByLabelText('Criar conta'));

    await waitFor(() => expect(utils.getByText('E-mail inválido')).toBeTruthy());
    expect(AuthService.signup).not.toHaveBeenCalled();
  });

  it('senha curta bloqueia envio', async () => {
    const utils = await render(<RegisterScreen />);
    await fillValidForm(utils);
    await fireEvent.press(utils.getByRole('checkbox'));
    await fireEvent.changeText(utils.getByPlaceholderText('Crie uma senha forte'), '123');
    await fireEvent.press(utils.getByLabelText('Criar conta'));

    await waitFor(() =>
      expect(utils.getByText('Senha deve ter no mínimo 8 caracteres')).toBeTruthy(),
    );
    expect(AuthService.signup).not.toHaveBeenCalled();
  });

  it('senhas divergentes bloqueiam envio', async () => {
    const utils = await render(<RegisterScreen />);
    await fillValidForm(utils);
    await fireEvent.press(utils.getByRole('checkbox'));
    await fireEvent.changeText(utils.getByPlaceholderText('Digite a senha novamente'), 'outra');
    await fireEvent.press(utils.getByLabelText('Criar conta'));

    await waitFor(() => expect(utils.getByText('Senhas não coincidem')).toBeTruthy());
    expect(AuthService.signup).not.toHaveBeenCalled();
  });

  it('checkbox de termos é obrigatório', async () => {
    const utils = await render(<RegisterScreen />);
    await fillValidForm(utils);
    await fireEvent.press(utils.getByLabelText('Criar conta'));

    await waitFor(() =>
      expect(utils.getByText('Você precisa aceitar os Termos de Uso')).toBeTruthy(),
    );
    expect(AuthService.signup).not.toHaveBeenCalled();
  });

  it('sucesso com sessão chama signup e valida identidade', async () => {
    (AuthService.signup as any).mockResolvedValue({
      user: { id: '1' },
      session: { access_token: 'x' },
    });
    (AuthService.validateCitizenIdentity as any).mockResolvedValue({
      id: '1',
      role: 'CITIZEN',
      is_active: true,
    });

    const utils = await render(<RegisterScreen />);
    await fillValidForm(utils);
    await fireEvent.press(utils.getByRole('checkbox'));
    await fireEvent.press(utils.getByLabelText('Criar conta'));

    await waitFor(() => {
      expect(AuthService.signup).toHaveBeenCalledWith({
        name: 'João Silva',
        email: 'joao@teste.com',
        password: 'senha12345',
      });
      expect(AuthService.validateCitizenIdentity).toHaveBeenCalled();
      expect(AuthService.logout).not.toHaveBeenCalled();
    });
  });

  it('sucesso sem sessão navega para VerifyEmail', async () => {
    (AuthService.signup as any).mockResolvedValue({
      user: { id: '1' },
      session: null,
    });

    const utils = await render(<RegisterScreen />);
    await fillValidForm(utils);
    await fireEvent.press(utils.getByRole('checkbox'));
    await fireEvent.press(utils.getByLabelText('Criar conta'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('VerifyEmail', {
        email: 'joao@teste.com',
      });
    });
  });

  it('e-mail duplicado exibe mensagem segura', async () => {
    (AuthService.signup as any).mockRejectedValue(
      new AppError(409, 'EMAIL_EXISTS', 'Este e-mail já está cadastrado.'),
    );

    const utils = await render(<RegisterScreen />);
    await fillValidForm(utils);
    await fireEvent.press(utils.getByRole('checkbox'));
    await fireEvent.press(utils.getByLabelText('Criar conta'));

    await waitFor(() =>
      expect(utils.getByText('Este e-mail já está cadastrado.')).toBeTruthy(),
    );
  });

  it('navega para login pelo rodapé', async () => {
    const utils = await render(<RegisterScreen />);
    await fireEvent.press(utils.getByLabelText('Entrar'));
    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });
});
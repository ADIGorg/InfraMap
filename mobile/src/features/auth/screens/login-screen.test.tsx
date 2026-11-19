import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from './login-screen';
import * as AuthService from '@/features/auth/services/auth.service';
import { AppError } from '@/shared/errors/app-error';
import { useNavigation, } from '@react-navigation/native';

let mockLoginRouteParams:
  | {
      emailConfirmed?: boolean;
    }
  | undefined;

jest.mock(
  '@react-navigation/native',
  () => ({
    useNavigation: jest.fn(),
    useRoute: () => ({
      key: 'Login-test',
      name: 'Login',
      params: mockLoginRouteParams,
    }),
  }),
);

jest.mock('@/features/auth/services/auth.service', () => ({
  loginWithPassword: jest.fn(),
  validateCitizenIdentity: jest.fn(),
  logout: jest.fn(),
}));

describe('LoginScreen', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockLoginRouteParams = undefined;

    (
      useNavigation as jest.Mock
    ).mockReturnValue({
      navigate: mockNavigate,
      goBack: jest.fn(),
      reset: jest.fn(),
    });
  });

  it('renderiza os elementos principais', async () => {
    const { getByText, getByPlaceholderText, getByLabelText } = await render(
      <LoginScreen />,
    );
    expect(getByText('Bem-vindo de volta! Acesse sua conta.')).toBeTruthy();
    expect(getByPlaceholderText('exemplo@email.com')).toBeTruthy();
    expect(getByPlaceholderText('Digite sua senha')).toBeTruthy();
    expect(getByLabelText('Mostrar senha')).toBeTruthy();
  });

  it('senha começa mascarada e revela ao tocar no olho', async () => {
    const { getByPlaceholderText, getByLabelText } = await render(<LoginScreen />);
    const passwordInput = getByPlaceholderText('Digite sua senha');

    expect(passwordInput.props.secureTextEntry).toBe(true);
    await fireEvent.press(getByLabelText('Mostrar senha'));
    expect(passwordInput.props.secureTextEntry).toBe(false);
  });

  it('mostra erro de validação se o e-mail for inválido', async () => {
    const { getByPlaceholderText, getByText, getByLabelText } = await render(
      <LoginScreen />,
    );
    await fireEvent.changeText(getByPlaceholderText('exemplo@email.com'), 'invalido');
    await fireEvent.press(getByLabelText('Entrar na sua conta'));

    await waitFor(() => {
      expect(getByText('E-mail inválido')).toBeTruthy();
    });
    expect(AuthService.loginWithPassword).not.toHaveBeenCalled();
  });

  it('login válido de CITIZEN ativo chama validação de identidade', async () => {
    (AuthService.loginWithPassword as any).mockResolvedValue({});
    (AuthService.validateCitizenIdentity as any).mockResolvedValue({
      id: '1',
      role: 'CITIZEN',
      is_active: true,
    });

    const { getByPlaceholderText, getByLabelText } = await render(<LoginScreen />);
    await fireEvent.changeText(
      getByPlaceholderText('exemplo@email.com'),
      'cidadao@teste.com',
    );
    await fireEvent.changeText(getByPlaceholderText('Digite sua senha'), 'senha123');
    await fireEvent.press(getByLabelText('Entrar na sua conta'));

    await waitFor(() => {
      expect(AuthService.loginWithPassword).toHaveBeenCalledWith(
        'cidadao@teste.com',
        'senha123',
      );
      expect(AuthService.validateCitizenIdentity).toHaveBeenCalled();
      expect(AuthService.logout).not.toHaveBeenCalled();
    });
  });

  it('credenciais inválidas exibem erro genérico sem revelar existência do usuário', async () => {
    (AuthService.loginWithPassword as any).mockRejectedValue(
      new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha inválidos.'),
    );

    const { getByPlaceholderText, getByText, getByLabelText } = await render(
      <LoginScreen />,
    );
    await fireEvent.changeText(getByPlaceholderText('exemplo@email.com'), 'x@x.com');
    await fireEvent.changeText(getByPlaceholderText('Digite sua senha'), 'errada');
    await fireEvent.press(getByLabelText('Entrar na sua conta'));

    await waitFor(() => {
      expect(getByText('E-mail ou senha inválidos.')).toBeTruthy();
    });
  });

  it('ADMIN logando no mobile é bloqueado (logout + mensagem)', async () => {
    (AuthService.loginWithPassword as any).mockResolvedValue({});
    (AuthService.validateCitizenIdentity as any).mockRejectedValue(
      new AppError(403, 'NOT_CITIZEN', 'Use o painel administrativo no navegador.'),
    );

    const { getByPlaceholderText, getByText, getByLabelText } = await render(
      <LoginScreen />,
    );
    await fireEvent.changeText(getByPlaceholderText('exemplo@email.com'), 'admin@teste.com');
    await fireEvent.changeText(getByPlaceholderText('Digite sua senha'), 'senha123');
    await fireEvent.press(getByLabelText('Entrar na sua conta'));

    await waitFor(() => {
      expect(AuthService.logout).toHaveBeenCalled();
      expect(getByText('Use o painel administrativo no navegador.')).toBeTruthy();
    });
  });

  it('conta inativa é bloqueada (logout + mensagem)', async () => {
    (AuthService.loginWithPassword as any).mockResolvedValue({});
    (AuthService.validateCitizenIdentity as any).mockRejectedValue(
      new AppError(403, 'INACTIVE_ACCOUNT', 'Conta inativa. Contate o suporte.'),
    );

    const { getByPlaceholderText, getByText, getByLabelText } = await render(
      <LoginScreen />,
    );
    await fireEvent.changeText(getByPlaceholderText('exemplo@email.com'), 'x@x.com');
    await fireEvent.changeText(getByPlaceholderText('Digite sua senha'), 'senha');
    await fireEvent.press(getByLabelText('Entrar na sua conta'));

    await waitFor(() => {
      expect(AuthService.logout).toHaveBeenCalled();
      expect(getByText('Conta inativa. Contate o suporte.')).toBeTruthy();
    });
  });

  it('navega para Register ao clicar em Criar conta no rodapé', async () => {
    const { getByLabelText } = await render(<LoginScreen />);
    await fireEvent.press(getByLabelText('Criar conta'));
    expect(mockNavigate).toHaveBeenCalledWith('Register');
  });

  it('navega para ForgotPassword ao clicar em Esqueci minha senha', async () => {
    const { getByLabelText } = await render(<LoginScreen />);
    await fireEvent.press(getByLabelText('Esqueci minha senha'));
    expect(mockNavigate).toHaveBeenCalledWith('ForgotPassword');
  });
});
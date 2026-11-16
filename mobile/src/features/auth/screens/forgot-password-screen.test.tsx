import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ForgotPasswordScreen } from './forgot-password-screen';
import * as AuthService from '@/features/auth/services/auth.service';
import { useNavigation } from '@react-navigation/native';
import { AppError } from '@/shared/errors/app-error';

jest.mock('@react-navigation/native', () => ({ useNavigation: jest.fn() }));
jest.mock('@/features/auth/services/auth.service', () => ({
  requestPasswordReset: jest.fn(),
}));

describe('ForgotPasswordScreen', () => {
  const mockGoBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as any).mockReturnValue({ goBack: mockGoBack });
  });

  it('renderiza header, campo e banner anti-enumeração', async () => {
    const { getByText, getByPlaceholderText, getByLabelText } = await render(
      <ForgotPasswordScreen />,
    );
    expect(getByText('Esqueci minha senha')).toBeTruthy();
    expect(getByPlaceholderText('exemplo@email.com')).toBeTruthy();
    expect(getByText(/Se o e-mail estiver cadastrado/)).toBeTruthy();
    expect(getByLabelText('Voltar')).toBeTruthy();
  });

  it('e-mail inválido bloqueia envio sem chamar o service', async () => {
    const { getByText, getByPlaceholderText } = await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(getByPlaceholderText('exemplo@email.com'), 'invalido');
    await fireEvent.press(getByText('Enviar link de recuperação'));

    await waitFor(() => {
      expect(getByText('E-mail inválido')).toBeTruthy();
    });
    expect(AuthService.requestPasswordReset).not.toHaveBeenCalled();
  });

  it('e-mail vazio bloqueia envio', async () => {
    const { getByText } = await render(<ForgotPasswordScreen />);
    await fireEvent.press(getByText('Enviar link de recuperação'));

    await waitFor(() => {
      expect(getByText('Informe seu e-mail')).toBeTruthy();
    });
    expect(AuthService.requestPasswordReset).not.toHaveBeenCalled();
  });

  it('e-mail válido chama service', async () => {
    (AuthService.requestPasswordReset as any).mockResolvedValueOnce(undefined);

    const { getByText, getByPlaceholderText } = await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(
      getByPlaceholderText('exemplo@email.com'),
      'user@example.com',
    );
    await fireEvent.press(getByText('Enviar link de recuperação'));

    await waitFor(() => {
      expect(AuthService.requestPasswordReset).toHaveBeenCalledWith(
        'user@example.com',
      );
    });
  });

  it('após envio, ativa cooldown e desabilita botão', async () => {
    (AuthService.requestPasswordReset as any).mockResolvedValueOnce(undefined);

    const { getByText, getByPlaceholderText, queryByText } = await render(
      <ForgotPasswordScreen />,
    );
    await fireEvent.changeText(
      getByPlaceholderText('exemplo@email.com'),
      'user@example.com',
    );
    await fireEvent.press(getByText('Enviar link de recuperação'));

    await waitFor(() => {
      expect(queryByText(/Aguarde \d+s/)).toBeTruthy();
    });
    expect(queryByText('Enviar link de recuperação')).toBeNull();
  });

  it('anti-enumeração: banner permanece idêntico após envio bem-sucedido', async () => {
    (AuthService.requestPasswordReset as any).mockResolvedValueOnce(undefined);

    const { getByText, getByPlaceholderText } = await render(<ForgotPasswordScreen />);
    getByText(/Se o e-mail estiver cadastrado/);

    await fireEvent.changeText(
      getByPlaceholderText('exemplo@email.com'),
      'user@example.com',
    );
    await fireEvent.press(getByText('Enviar link de recuperação'));

    await waitFor(() => {
      expect(getByText(/Se o e-mail estiver cadastrado/)).toBeTruthy();
    });
  });

  it('falha de rede mostra erro e permite retry (não ativa cooldown)', async () => {
    (AuthService.requestPasswordReset as any).mockRejectedValueOnce(
      new AppError(500, 'NETWORK_ERROR', 'Erro de conexão.'),
    );

    const { getByText, getByPlaceholderText, queryByText } = await render(
      <ForgotPasswordScreen />,
    );
    await fireEvent.changeText(
      getByPlaceholderText('exemplo@email.com'),
      'user@example.com',
    );
    await fireEvent.press(getByText('Enviar link de recuperação'));

    await waitFor(() => {
      expect(getByText('Erro de conexão.')).toBeTruthy();
    });
    expect(getByText('Enviar link de recuperação')).toBeTruthy();
    expect(queryByText(/Aguarde \d+s/)).toBeNull();
  });

  it('rate limit mostra mensagem específica', async () => {
    (AuthService.requestPasswordReset as any).mockRejectedValueOnce(
      new AppError(
        429,
        'TOO_MANY_REQUESTS',
        'Muitas solicitações. Aguarde alguns minutos.',
      ),
    );

    const { getByText, getByPlaceholderText } = await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(
      getByPlaceholderText('exemplo@email.com'),
      'user@example.com',
    );
    await fireEvent.press(getByText('Enviar link de recuperação'));

    await waitFor(() => {
      expect(
        getByText('Muitas solicitações. Aguarde alguns minutos.'),
      ).toBeTruthy();
    });
  });

  it('botão Voltar chama navigation.goBack', async () => {
    const { getByLabelText } = await render(<ForgotPasswordScreen />);
    await fireEvent.press(getByLabelText('Voltar'));
    expect(mockGoBack).toHaveBeenCalled();
  });
}); 
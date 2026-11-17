import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ResetPasswordScreen } from './reset-password-screen';
import * as AuthService from '@/features/auth/services/auth.service';
import { useNavigation } from '@react-navigation/native';
import { AppError } from '@/shared/errors/app-error';

jest.mock('@react-navigation/native', () => ({ useNavigation: jest.fn() }));
jest.mock('@/features/auth/services/auth.service', () => ({
  updatePassword: jest.fn(),
}));

describe('ResetPasswordScreen', () => {
  const mockReset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as any).mockReturnValue({ reset: mockReset });
  });

  it('renderiza formulário de nova senha', async () => {
    const { getAllByText, getByLabelText, getByText } = await render(
      <ResetPasswordScreen />,
    );
    // "Nova senha" aparece no título e no label do InputField — getAllByText cobre ambos
    expect(getAllByText('Nova senha').length).toBeGreaterThanOrEqual(1);
    expect(getByLabelText('Campo de nova senha')).toBeTruthy();
    expect(getByLabelText('Campo de confirmação de senha')).toBeTruthy();
    expect(getByText('Atualizar senha')).toBeTruthy();
  });

  it('senha curta bloqueia envio', async () => {
    const { getByText, getByLabelText } = await render(<ResetPasswordScreen />);
    await fireEvent.changeText(getByLabelText('Campo de nova senha'), '123');
    await fireEvent.changeText(
      getByLabelText('Campo de confirmação de senha'),
      '123',
    );
    await fireEvent.press(getByText('Atualizar senha'));

    await waitFor(() => {
      expect(getByText('Senha deve ter no mínimo 8 caracteres')).toBeTruthy();
    });
    expect(AuthService.updatePassword).not.toHaveBeenCalled();
  });

  it('senhas divergentes bloqueiam envio', async () => {
    const { getByText, getByLabelText } = await render(<ResetPasswordScreen />);
    await fireEvent.changeText(getByLabelText('Campo de nova senha'), 'senha12345');
    await fireEvent.changeText(
      getByLabelText('Campo de confirmação de senha'),
      'outra',
    );
    await fireEvent.press(getByText('Atualizar senha'));

    await waitFor(() => {
      expect(getByText('Senhas não coincidem')).toBeTruthy();
    });
    expect(AuthService.updatePassword).not.toHaveBeenCalled();
  });

  it('confirmação vazia bloqueia envio', async () => {
    const { getByText, getByLabelText } = await render(<ResetPasswordScreen />);
    await fireEvent.changeText(getByLabelText('Campo de nova senha'), 'senha12345');
    await fireEvent.press(getByText('Atualizar senha'));

    await waitFor(() => {
      expect(getByText('Confirme sua senha')).toBeTruthy();
    });
    expect(AuthService.updatePassword).not.toHaveBeenCalled();
  });

  it('sucesso chama service e mostra tela de sucesso', async () => {
    (AuthService.updatePassword as jest.Mock).mockResolvedValueOnce(undefined);

    const { getByText, getByLabelText } = await render(<ResetPasswordScreen />);
    await fireEvent.changeText(getByLabelText('Campo de nova senha'), 'senha12345');
    await fireEvent.changeText(
      getByLabelText('Campo de confirmação de senha'),
      'senha12345',
    );
    await fireEvent.press(getByText('Atualizar senha'));

    await waitFor(() => {
      expect(AuthService.updatePassword).toHaveBeenCalledWith('senha12345');
      expect(getByText('Senha atualizada!')).toBeTruthy();
    });
  });

  it('erro do service mostra banner', async () => {
    (AuthService.updatePassword as jest.Mock).mockRejectedValueOnce(
      new AppError(400, 'SAME_PASSWORD', 'A nova senha deve ser diferente da anterior.'),
    );

    const { getByText, getByLabelText } = await render(<ResetPasswordScreen />);
    await fireEvent.changeText(getByLabelText('Campo de nova senha'), 'senha12345');
    await fireEvent.changeText(
      getByLabelText('Campo de confirmação de senha'),
      'senha12345',
    );
    await fireEvent.press(getByText('Atualizar senha'));

    await waitFor(() => {
      expect(getByText('A nova senha deve ser diferente da anterior.')).toBeTruthy();
    });
  });

  it('botão Continuar na tela de sucesso reseta navegação', async () => {
    (AuthService.updatePassword as jest.Mock).mockResolvedValueOnce(undefined);

    const { getByText, getByLabelText } = await render(<ResetPasswordScreen />);
    await fireEvent.changeText(getByLabelText('Campo de nova senha'), 'senha12345');
    await fireEvent.changeText(
      getByLabelText('Campo de confirmação de senha'),
      'senha12345',
    );
    await fireEvent.press(getByText('Atualizar senha'));

    await waitFor(() => {
      expect(getByText('Continuar para o app')).toBeTruthy();
    });

    await fireEvent.press(getByText('Continuar para o app'));
    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'AppTabs' }],
    });
  });
});
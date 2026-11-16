import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { WelcomeScreen } from './welcome-screen';
import * as ViewModel from '@/features/auth/view-models/use-welcome-view-model';
import { useNavigation } from '@react-navigation/native';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('@/features/auth/view-models/use-welcome-view-model', () => ({
  useWelcomeViewModel: jest.fn(),
}));

describe('WelcomeScreen', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as any).mockReturnValue({ navigate: mockNavigate });

    (ViewModel.useWelcomeViewModel as any).mockReturnValue({
      navigateToLogin: mockNavigate,
      navigateToRegister: mockNavigate,
      navigateToExploreMap: mockNavigate,
      isAuthenticated: false,
      session: null,
    });
  });

  it('deve renderizar os elementos principais (acessibilidade)', async () => {
    const { getByText, getByLabelText } = await render(<WelcomeScreen />);

    expect(getByText('InfraMap')).toBeTruthy();
    expect(getByText('Entrar')).toBeTruthy();
    expect(getByLabelText('Explorar o mapa sem fazer login')).toBeTruthy();
  });

  it('deve chamar a navegação correta ao clicar em Entrar', async () => {
    const { getByText } = await render(<WelcomeScreen />);
    await fireEvent.press(getByText('Entrar'));
    expect(mockNavigate).toHaveBeenCalled();
  });

  it('deve chamar a navegação correta ao clicar em Criar Conta', async () => {
    const { getByText } = await render(<WelcomeScreen />);
    await fireEvent.press(getByText('Criar conta'));
    expect(mockNavigate).toHaveBeenCalled();
  });

  it('deve chamar a navegação correta ao clicar em Explorar o Mapa', async () => {
    const { getByText } = await render(<WelcomeScreen />);
    await fireEvent.press(getByText('Explorar o Mapa'));
    expect(mockNavigate).toHaveBeenCalled();
  });
});
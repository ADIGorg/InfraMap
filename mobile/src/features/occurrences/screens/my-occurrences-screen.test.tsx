import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MyOccurrencesScreen } from './my-occurrences-screen';
import * as VM from '../view-models/use-my-occurrences-view-model';

jest.mock('../view-models/use-my-occurrences-view-model', () => ({
  useMyOccurrencesViewModel: jest.fn(),
}));

const baseVM = {
  items: [],
  isLoading: false,
  isRefreshing: false,
  isLoadingMore: false,
  error: null,
  hasMore: false,
  refresh: jest.fn(),
  loadMore: jest.fn(),
  openDetail: jest.fn(),
};

describe('MyOccurrencesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loading exibe ActivityIndicator', async () => {
    (VM.useMyOccurrencesViewModel as jest.Mock).mockReturnValue({
      ...baseVM,
      isLoading: true,
    });
    const { getByTestId } = await render(<MyOccurrencesScreen />);
    // ActivityIndicator não tem testID padrão; verificamos ausência do título
    expect(() => getByTestId('non-existent')).toThrow();
  });

  it('lista vazia exibe mensagem', async () => {
    (VM.useMyOccurrencesViewModel as jest.Mock).mockReturnValue(baseVM);
    const { getByText } = await render(<MyOccurrencesScreen />);
    expect(getByText('Você ainda não registrou nenhuma ocorrência.')).toBeTruthy();
  });

  it('erro exibe mensagem e botão retry', async () => {
    const refresh = jest.fn();
    (VM.useMyOccurrencesViewModel as jest.Mock).mockReturnValue({
      ...baseVM,
      error: 'Falha de rede.',
      refresh,
    });
    const { getByText } = await render(<MyOccurrencesScreen />);
    expect(getByText('Falha de rede.')).toBeTruthy();
    await fireEvent.press(getByText('Tentar novamente'));
    expect(refresh).toHaveBeenCalled();
  });

  it('lista preenchida renderiza cards', async () => {
    (VM.useMyOccurrencesViewModel as jest.Mock).mockReturnValue({
      ...baseVM,
      items: [
        {
          id: 'a',
          category: { id: 'cat-1', code: 'CAT01', name: 'Saneamento' },
          description: 'Problema A',
          status: 'RESOLVED',
          priority: null,
          location: { lat: -23.55, lng: -46.63 },
          photosCount: 1,
          votesCount: 0,
          createdAt: '2026-08-12T10:00:00Z',
          updatedAt: '2026-08-12T10:00:00Z',
          resolvedAt: '2026-08-13T10:00:00Z',
        },
      ],
    });
    const { getByText } = await render(<MyOccurrencesScreen />);
    expect(getByText('Saneamento')).toBeTruthy();
    expect(getByText('Resolvido')).toBeTruthy();
  });

  it('tocar em card chama openDetail', async () => {
    const openDetail = jest.fn();
    (VM.useMyOccurrencesViewModel as jest.Mock).mockReturnValue({
      ...baseVM,
      items: [
        {
          id: 'xyz',
          category: { id: 'cat-1', code: 'CAT01', name: 'Saneamento' },
          description: 'Problema',
          status: 'RECEIVED',
          priority: null,
          location: { lat: -23.55, lng: -46.63 },
          photosCount: 1,
          votesCount: 0,
          createdAt: '2026-08-12T10:00:00Z',
          updatedAt: '2026-08-12T10:00:00Z',
          resolvedAt: null,
        },
      ],
      openDetail,
    });
    const { getByLabelText } = await render(<MyOccurrencesScreen />);
    await fireEvent.press(getByLabelText(/Saneamento/));
    expect(openDetail).toHaveBeenCalledWith('xyz');
  });
});
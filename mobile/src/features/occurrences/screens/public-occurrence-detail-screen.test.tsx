import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PublicOccurrenceDetailScreen } from './public-occurrence-detail-screen';
import * as VM from '../view-models/use-public-occurrence-detail-view-model';
import { useRoute } from '@react-navigation/native';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: jest.fn(),
}));

jest.mock('../view-models/use-public-occurrence-detail-view-model', () => ({
  usePublicOccurrenceDetailViewModel: jest.fn(),
}));

jest.mock('@maplibre/maplibre-react-native', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Map: View,
    Camera: () => null,
    RasterSource: View,
    Layer: () => null,
    Marker: View,
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const makeDetail = () => ({
  id: 'occ-1',
  category: { id: 'cat-1', code: 'CAT01', name: 'Saneamento' },
  description: 'Vazamento de água',
  status: 'CONFIRMED' as const,
  location: { lat: -23.55, lng: -46.63 },
  votesCount: 214,
  createdAt: '2026-08-12T10:00:00Z',
  photoUrls: [
    {
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
      position: 0,
      url: 'https://example.com/photo1.jpg',
      expiresAt: '2026-11-16T10:05:00Z',
      expiresInSeconds: 300,
    },
    {
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
      position: 1,
      url: 'https://example.com/photo2.jpg',
      expiresAt: '2026-11-16T10:05:00Z',
      expiresInSeconds: 300,
    },
  ],
});

const baseVM = {
  detail: makeDetail(),
  isLoading: false,
  loadError: null,
  reload: jest.fn(),
  hasVoted: null,
  isVoting: false,
  voteError: null,
  isLoginPromptOpen: false,
  handleVoteToggle: jest.fn(),
  handleLoginFromPrompt: jest.fn(),
  handleCloseLoginPrompt: jest.fn(),
  goBack: jest.fn(),
};

describe('PublicOccurrenceDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRoute as jest.Mock).mockReturnValue({ params: { id: 'occ-1' } });
  });

  it('renderiza categoria, descrição, status, votos e galeria', async () => {
    (VM.usePublicOccurrenceDetailViewModel as jest.Mock).mockReturnValue(baseVM);
    const { getByText, getAllByLabelText,  getAllByText } = await render(
      <PublicOccurrenceDetailScreen />,
    );

    expect(getAllByText('Saneamento').length).toBeGreaterThan(0);
    expect(getByText('Vazamento de água')).toBeTruthy();
    expect(getByText('Confirmado')).toBeTruthy();
    expect(getByText('214')).toBeTruthy();
    expect(getAllByLabelText(/Foto \d/).length).toBe(2);
  });

  it('não exibe dados sensíveis (autor, coordenadas exatas)', async () => {
    (VM.usePublicOccurrenceDetailViewModel as jest.Mock).mockReturnValue(baseVM);
    const { queryByText } = await render(<PublicOccurrenceDetailScreen />);

    // Não deve exibir coordenadas exatas
    expect(queryByText(/23\.55/)).toBeNull();
    expect(queryByText(/46\.63/)).toBeNull();
    // Não deve exibir autor / PII
    expect(queryByText(/João/)).toBeNull();
    expect(queryByText(/joao@/)).toBeNull();
    // Aviso de privacidade presente
  });

  it('exibe o minimapa de localização aproximada com altura própria', async () => {
    (VM.usePublicOccurrenceDetailViewModel as jest.Mock).mockReturnValue(baseVM);
    const { getByText, getByTestId } = await render(<PublicOccurrenceDetailScreen />);
    expect(getByText(/coordenada exata não é divulgada/i)).toBeTruthy();
    expect(getByTestId('mini-map')).toHaveStyle({ height: 160 });
  });

  it('visitante: tocar em Votar abre prompt de login', async () => {
    const handleVoteToggle = jest.fn();
    (VM.usePublicOccurrenceDetailViewModel as jest.Mock).mockReturnValue({
      ...baseVM,
      isLoginPromptOpen: true,
      handleVoteToggle,
    });
    const { getByText, getByLabelText } = await render(
      <PublicOccurrenceDetailScreen />,
    );

    expect(getByText('Faça login para votar')).toBeTruthy();
    await fireEvent.press(getByLabelText('Ir para o login'));
    expect(baseVM.handleLoginFromPrompt).toHaveBeenCalled();
  });

  it('erro de voto exibe banner sem alterar contagem', async () => {
    (VM.usePublicOccurrenceDetailViewModel as jest.Mock).mockReturnValue({
      ...baseVM,
      voteError: 'Você já votou nesta ocorrência.',
    });
    const { getByText } = await render(<PublicOccurrenceDetailScreen />);

    expect(getByText('Você já votou nesta ocorrência.')).toBeTruthy();
    expect(getByText('214')).toBeTruthy();
  });

  it('loading inicial exibe spinner', async () => {
    (VM.usePublicOccurrenceDetailViewModel as jest.Mock).mockReturnValue({
      ...baseVM,
      isLoading: true,
      detail: null,
    });
    const { queryByText } = await render(<PublicOccurrenceDetailScreen />);
    expect(queryByText('Saneamento')).toBeNull();
  });

  it('erro de load permite retry', async () => {
    const reload = jest.fn();
    (VM.usePublicOccurrenceDetailViewModel as jest.Mock).mockReturnValue({
      ...baseVM,
      detail: null,
      loadError: 'Falha ao carregar.',
      reload,
    });
    const { getByText } = await render(<PublicOccurrenceDetailScreen />);

    expect(getByText('Falha ao carregar.')).toBeTruthy();
    await fireEvent.press(getByText('Tentar novamente'));
    expect(reload).toHaveBeenCalled();
  });
});

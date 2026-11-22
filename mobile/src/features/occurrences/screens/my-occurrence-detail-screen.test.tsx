import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { MyOccurrenceDetailScreen } from './my-occurrence-detail-screen';
import * as VM from '../view-models/use-my-occurrence-detail-view-model';

jest.mock('../view-models/use-my-occurrence-detail-view-model', () => ({
  useMyOccurrenceDetailViewModel: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { id: 'occ-1' } }),
}));
jest.mock('../components/photo-gallery', () => ({ PhotoGallery: () => null }));

const base = {
  detail: {
    id: 'occ-1',
    category: { id: 'cat-1', code: 'CAT04', name: 'Resíduos e Limpeza Urbana' },
    description: 'Descarte irregular',
    status: 'REJECTED',
    priority: null,
    location: { lat: -12.266, lng: -38.966 },
    photosCount: 1,
    votesCount: 0,
    createdAt: '2026-08-12T10:00:00Z',
    updatedAt: '2026-08-13T10:00:00Z',
    resolvedAt: null,
    photos: [],
    photoUrls: [],
  },
  history: [],
  isLoading: false,
  error: null,
  reload: jest.fn(),
  refreshPhotos: jest.fn(),
  goBack: jest.fn(),
};

describe('MyOccurrenceDetailScreen', () => {
  it('renderiza detalhe terminal, data e localização de referência', async () => {
    (VM.useMyOccurrenceDetailViewModel as jest.Mock).mockReturnValue(base);
    const ui = await render(<MyOccurrenceDetailScreen />);

    expect(ui.getAllByText('Resíduos e Limpeza Urbana').length).toBeGreaterThanOrEqual(1);
    expect(ui.getByText('Rejeitado')).toBeTruthy();
    expect(ui.getByText('12/08/2026')).toBeTruthy();
    expect(ui.getByText('-12.26600, -38.96600')).toBeTruthy();
  });

  it('estado de erro permite retry', async () => {
    const reload = jest.fn();
    (VM.useMyOccurrenceDetailViewModel as jest.Mock).mockReturnValue({
      ...base,
      detail: null,
      error: 'Falha',
      reload,
    });

    const ui = await render(<MyOccurrenceDetailScreen />);
    await fireEvent.press(ui.getByText('Tentar novamente'));

    expect(reload).toHaveBeenCalled();
  });

  it('mantém o botão Voltar dentro da área segura e chama goBack', async () => {
    const goBack = jest.fn();
    (VM.useMyOccurrenceDetailViewModel as jest.Mock).mockReturnValue({ ...base, goBack });
    const ui = await render(<MyOccurrenceDetailScreen />);
    expect(ui.root?.props.edges?.top).toBe('additive');
    await fireEvent.press(ui.getByRole('button', { name: 'Voltar' }));

    expect(goBack).toHaveBeenCalledTimes(1);
  });
});

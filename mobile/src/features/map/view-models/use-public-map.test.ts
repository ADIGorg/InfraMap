import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePublicMapViewModel } from './use-public-map';
import * as PublicService from '@/features/occurrences/services/public-occurrences.service';

jest.mock('@/features/occurrences/services/public-occurrences.service', () => ({
  getPublicOccurrences: jest.fn(),
  getCategories: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
};

describe('usePublicMapViewModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (PublicService.getCategories as jest.Mock).mockResolvedValue([
      { id: 'cat-1', code: 'CAT01', name: 'Saneamento' },
    ]);
    (PublicService.getPublicOccurrences as jest.Mock).mockResolvedValue({
      data: [
        {
          id: 'occ-1',
          category: { id: 'cat-1', code: 'CAT01', name: 'Saneamento' },
          description: 'Vazamento',
          status: 'CONFIRMED',
          location: { lat: -23.55, lng: -46.63 },
          votesCount: 10,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'occ-2',
          category: { id: 'cat-2', code: 'CAT02', name: 'Iluminação' },
          description: 'Poste apagado',
          status: 'RESOLVED', // deve ser filtrado
          location: { lat: -23.56, lng: -46.64 },
          votesCount: 5,
          createdAt: new Date().toISOString(),
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
    });
  });

    it('carrega categorias', async () => {
    const { result } = await renderHook(() => usePublicMapViewModel(), { wrapper });
    await waitFor(() => expect(result.current.isLoadingCategories).toBe(false));
    expect(result.current.categories).toHaveLength(1);
    });

    it('filtra apenas CONFIRMED e IN_SERVICE', async () => {
    const { result } = await renderHook(() => usePublicMapViewModel(), { wrapper });
    await act(async () => {
        result.current.onRegionChangeComplete({
        latitude: -23.55,
        longitude: -46.63,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
        });
    });
    await waitFor(() => expect(result.current.occurrences).toHaveLength(1));
    expect(result.current.occurrences[0].status).toBe('CONFIRMED');
    });

    it('expõe erro quando a API falha', async () => {
    (PublicService.getPublicOccurrences as jest.Mock).mockRejectedValue(
        new Error('Network'),
    );
    const { result } = await renderHook(() => usePublicMapViewModel(), { wrapper });
    await act(async () => {
        result.current.onRegionChangeComplete({
        latitude: -23.55,
        longitude: -46.63,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
        });
    });
    await waitFor(() => expect(result.current.error).toBeTruthy());
    });
});
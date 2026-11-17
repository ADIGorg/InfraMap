import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useMyOccurrencesViewModel } from './use-my-occurrences-view-model';
import * as Service from '../services/my-occurrences.service';
import { AppError } from '@/shared/errors/app-error';

jest.mock('../services/my-occurrences.service');
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

const makeItem = (id: string, status: 'RECEIVED' | 'RESOLVED' | 'REJECTED' = 'RECEIVED') => ({
  id,
  category: { id: 'cat-1', code: 'CAT01', name: 'Saneamento' },
  description: 'Problema',
  status,
  priority: null,
  location: { lat: -23.55, lng: -46.63 },
  photosCount: 1,
  votesCount: 0,
  createdAt: '2026-08-12T10:00:00Z',
  updatedAt: '2026-08-12T10:00:00Z',
  resolvedAt: status === 'RESOLVED' ? '2026-08-13T10:00:00Z' : null,
});

describe('useMyOccurrencesViewModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lista vazia', async () => {
    (Service.getMyOccurrences as jest.Mock).mockResolvedValueOnce({
      data: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const { result } = await renderHook(() => useMyOccurrencesViewModel());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items).toEqual([]);
    expect(result.current.hasMore).toBe(false);
  });

  it('lista preenchida incluindo RESOLVED e REJECTED (RN045)', async () => {
    (Service.getMyOccurrences as jest.Mock).mockResolvedValueOnce({
      data: [makeItem('a', 'RECEIVED'), makeItem('b', 'RESOLVED'), makeItem('c', 'REJECTED')],
      pagination: { page: 1, pageSize: 20, total: 3, totalPages: 1 },
    });

    const { result } = await renderHook(() => useMyOccurrencesViewModel());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items.map((i) => i.status)).toEqual([
      'RECEIVED',
      'RESOLVED',
      'REJECTED',
    ]);
  });

  it('erro preenche mensagem', async () => {
    (Service.getMyOccurrences as jest.Mock).mockRejectedValueOnce(
      new AppError(500, 'ERR', 'Falha de rede.'),
    );

    const { result } = await renderHook(() => useMyOccurrencesViewModel());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Falha de rede.');
  });

  it('refresh refaz a página 1', async () => {
    (Service.getMyOccurrences as jest.Mock)
      .mockResolvedValueOnce({
        data: [makeItem('a')],
        pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      })
      .mockResolvedValueOnce({
        data: [makeItem('a'), makeItem('b')],
        pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
      });

    const { result } = await renderHook(() => useMyOccurrencesViewModel());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.refresh();
    });
    await waitFor(() => expect(result.current.isRefreshing).toBe(false));
    expect(result.current.items).toHaveLength(2);
  });

  it('paginação deduplica ids entre páginas', async () => {
    (Service.getMyOccurrences as jest.Mock)
      .mockResolvedValueOnce({
        data: [makeItem('a'), makeItem('b')],
        pagination: { page: 1, pageSize: 2, total: 3, totalPages: 2 },
      })
      .mockResolvedValueOnce({
        // página 2 repete "b" (dado mudou entre páginas)
        data: [makeItem('b'), makeItem('c')],
        pagination: { page: 2, pageSize: 2, total: 3, totalPages: 2 },
      });

    const { result } = await renderHook(() => useMyOccurrencesViewModel());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.loadMore();
    });
    await waitFor(() => expect(result.current.isLoadingMore).toBe(false));
    expect(result.current.items.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });
});
import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as OccurrenceService from '../services/my-occurrences.service';
import * as HistoryService from '../services/history.service';
import { AppError } from '@/shared/errors/app-error';
import type { HistoryEvent } from '@/shared/types/api';
import {
  isHistoryEventVisibleToAuthor,
  useMyOccurrenceDetailViewModel,
} from './use-my-occurrence-detail-view-model';

jest.mock('../services/my-occurrences.service');
jest.mock('../services/history.service');
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));

const detail = {
  id: 'occ-1',
  category: { id: 'cat-1', code: 'CAT04', name: 'Resíduos' },
  description: 'Lixo',
  status: 'RESOLVED',
  priority: null,
  location: { lat: -12.26, lng: -38.96 },
  photosCount: 1,
  votesCount: 0,
  createdAt: '2026-08-12T10:00:00Z',
  updatedAt: '2026-08-13T10:00:00Z',
  resolvedAt: '2026-08-13T10:00:00Z',
  photos: [],
  photoUrls: [],
} as const;

const event = (
  id: string,
  visibility?: string,
  createdAt = '2026-08-12T10:00:00Z',
): HistoryEvent => ({
  id,
  actorId: null,
  action: 'OBSERVATION_ADDED',
  actorType: 'USER',
  previousData: null,
  newData: null,
  details: visibility ? { visibility, content: id } : null,
  createdAt,
});

describe('useMyOccurrenceDetailViewModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (OccurrenceService.getMyOccurrenceById as jest.Mock).mockResolvedValue(detail);
    (HistoryService.getOccurrenceHistory as jest.Mock).mockResolvedValue([]);
  });

  it('carrega detalhe próprio e mantém status terminal', async () => {
    const { result } = await renderHook(() =>
      useMyOccurrenceDetailViewModel({ id: 'occ-1' }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.detail?.status).toBe('RESOLVED');
  });

  it('filtra INTERNAL, mantém CITIZEN_RESPONSE e ordena cronologicamente', async () => {
    (HistoryService.getOccurrenceHistory as jest.Mock).mockResolvedValue([
      event('late', 'CITIZEN_RESPONSE', '2026-08-13T10:00:00Z'),
      event('secret', 'INTERNAL', '2026-08-11T10:00:00Z'),
      event('early', 'CITIZEN_RESPONSE', '2026-08-12T10:00:00Z'),
    ]);
    const { result } = await renderHook(() =>
      useMyOccurrenceDetailViewModel({ id: 'occ-1' }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.history.map((item: HistoryEvent) => item.id)).toEqual([
      'early',
      'late',
    ]);
  });

  it('403 exibe acesso negado e não renderiza detalhe', async () => {
    (OccurrenceService.getMyOccurrenceById as jest.Mock).mockRejectedValue(
      new AppError(403, 'FORBIDDEN', 'Forbidden'),
    );
    const { result } = await renderHook(() =>
      useMyOccurrenceDetailViewModel({ id: 'occ-1' }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.detail).toBeNull();
    expect(result.current.error).toContain('não tem permissão');
  });

  it('reload refaz detalhe e histórico para renovar signed URLs', async () => {
    const { result } = await renderHook(() =>
      useMyOccurrenceDetailViewModel({ id: 'occ-1' }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.reload();
    });
    expect(OccurrenceService.getMyOccurrenceById).toHaveBeenCalledTimes(2);
    expect(HistoryService.getOccurrenceHistory).toHaveBeenCalledTimes(2);
  });

  it('filtro defensivo não permite observação INTERNAL', () => {
    expect(isHistoryEventVisibleToAuthor(event('x', 'INTERNAL'))).toBe(false);
    expect(isHistoryEventVisibleToAuthor(event('x', 'CITIZEN_RESPONSE'))).toBe(true);
  });
});

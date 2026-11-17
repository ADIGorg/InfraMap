import { renderHook, act } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { useOccurrencePreviewViewModel } from './use-occurrence-preview-view-model';
import type { PublicOccurrenceListItem } from '@/shared/types/api';

jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});

const mockOccurrence: PublicOccurrenceListItem = {
  id: 'occ-1',
  category: { id: 'cat-1', code: 'CAT01', name: 'Saneamento' },
  description: 'Vazamento de água na via',
  status: 'CONFIRMED',
  location: { lat: -23.55, lng: -46.63 },
  votesCount: 10,
  createdAt: new Date().toISOString(),
};

describe('useOccurrencePreviewViewModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deriva conteúdo seguro do item', async () => {
    const onClose = jest.fn();
    const onViewDetails = jest.fn();
    const { result } = await renderHook(() =>
      useOccurrencePreviewViewModel({
        occurrence: mockOccurrence,
        onClose,
        onViewDetails,
      }),
    );

    expect(result.current.isOpen).toBe(true);
    expect(result.current.categoryName).toBe('Saneamento');
    expect(result.current.statusLabel).toBe('Confirmada');
    expect(result.current.description).toBe('Vazamento de água na via');
    expect(result.current.locationLabel).toBe('Localização aproximada');
    expect(result.current.votesCount).toBe(10);
  });

  it('handleViewDetails navega com id correto e fecha', async () => {
    const onClose = jest.fn();
    const onViewDetails = jest.fn();
    const { result } = await renderHook(() =>
      useOccurrencePreviewViewModel({
        occurrence: mockOccurrence,
        onClose,
        onViewDetails,
      }),
    );

    await act(async () => {
      result.current.handleViewDetails();
    });

    expect(onViewDetails).toHaveBeenCalledWith('occ-1');
    expect(onClose).toHaveBeenCalled();
  });

  it('handleViewDetails com occurrence null fecha sem navegar (fallback)', async () => {
    const onClose = jest.fn();
    const onViewDetails = jest.fn();
    const { result } = await renderHook(() =>
      useOccurrencePreviewViewModel({
        occurrence: null,
        onClose,
        onViewDetails,
      }),
    );

    await act(async () => {
      result.current.handleViewDetails();
    });

    expect(onViewDetails).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('handleClose chama onClose e anuncia', async () => {
    const onClose = jest.fn();
    const onViewDetails = jest.fn();
    const { result } = await renderHook(() =>
      useOccurrencePreviewViewModel({
        occurrence: mockOccurrence,
        onClose,
        onViewDetails,
      }),
    );

    await act(async () => {
      result.current.handleClose();
    });

    expect(onClose).toHaveBeenCalled();
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      'Detalhes fechados, mapa disponível.',
    );
  });

  it('isOpen false quando occurrence é null', async () => {
    const { result } = await renderHook(() =>
      useOccurrencePreviewViewModel({
        occurrence: null,
        onClose: jest.fn(),
        onViewDetails: jest.fn(),
      }),
    );

    expect(result.current.isOpen).toBe(false);
  });
});
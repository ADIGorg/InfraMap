import { useCallback, useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';
import type { PublicOccurrenceListItem } from '@/shared/types/api';

interface Params {
  occurrence: PublicOccurrenceListItem | null;
  onClose: () => void;
  onViewDetails: (id: string) => void;
}

const STATUS_LABEL: Record<PublicOccurrenceListItem['status'], string> = {
  CONFIRMED: 'Confirmada',
  IN_SERVICE: 'Em atendimento',
};

export function useOccurrencePreviewViewModel({
  occurrence,
  onClose,
  onViewDetails,
}: Params) {
  const isOpen = occurrence !== null;

  // Anuncia abertura para leitor de tela (foco básico)
  useEffect(() => {
    if (isOpen && occurrence) {
      AccessibilityInfo.announceForAccessibility(
        `Ocorrência aberta: ${occurrence.category.name}, ${STATUS_LABEL[occurrence.status]}`,
      );
    }
  }, [isOpen, occurrence]);

  const handleClose = useCallback(() => {
    if (isOpen) {
      AccessibilityInfo.announceForAccessibility('Detalhes fechados, mapa disponível.');
    }
    onClose();
  }, [isOpen, onClose]);

  const handleViewDetails = useCallback(() => {
    if (!occurrence) {
      // Fallback: item removido entre seleção e clique
      onClose();
      return;
    }
    onViewDetails(occurrence.id);
    onClose();
  }, [occurrence, onViewDetails, onClose]);

  return {
    isOpen,
    categoryName: occurrence?.category.name ?? '',
    statusLabel: occurrence ? STATUS_LABEL[occurrence.status] : '',
    description: occurrence?.description ?? '',
    locationLabel: 'Localização aproximada',
    votesCount: occurrence?.votesCount ?? 0,
    handleClose,
    handleViewDetails,
  };
}
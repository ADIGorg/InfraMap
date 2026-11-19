import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/types/query-keys';
import { AppError } from '@/shared/errors/app-error';
import {
  ACTIVE_STATUSES,
  DEFAULT_FILTERS,
  adjustAdminOccurrenceLocation,
  getAdminMapOccurrenceDetail,
  isActiveStatus,
  listActiveAdminOccurrences,
  listMapCategories,
  validateBounds,
  type AdminMapOccurrence,
  type ActiveStatus,
  type Bounds,
  type GeoPoint,
  type MapFilters,
} from '../services/admin-occurrences.service';
import { validPoint, type MapViewport } from '../services/map-presentation';

type Draft = Pick<MapFilters, 'statuses' | 'categoryId'>;

function freshDraft(): Draft {
  return { statuses: [...ACTIVE_STATUSES], categoryId: '' };
}

export function describeMapMutationError(error: unknown): string {
  if (error instanceof AppError) {
    if (error.statusCode === 403) return 'Seu usuário não possui permissão para corrigir esta localização.';
    if (error.statusCode === 409) return 'A ocorrência mudou ou não permite este ajuste. Atualize a página e tente novamente.';
    if (error.statusCode === 400) return 'Coordenadas inválidas. Revise os valores informados.';
    if (error.statusCode === 401) return 'Sua sessão expirou. Entre novamente antes de tentar corrigir.';
  }
  return 'Não foi possível salvar o ajuste. A localização anterior foi mantida.';
}

export function useAdminMapViewModel() {
  const client = useQueryClient();
  const [draft, setDraft] = useState<Draft>(freshDraft);
  const [applied, setApplied] = useState<MapFilters>(DEFAULT_FILTERS);
  const [availableBounds, setAvailableBounds] = useState<Bounds | null>(null);
  // A ViewModel preserva o enquadramento mesmo se o mapa for desmontado para exibir a lista.
  const [viewport, setViewport] = useState<MapViewport | null>(null);
  const [selection, setSelection] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState<AdminMapOccurrence | null>(null);
  const [candidate, setCandidate] = useState<GeoPoint | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  const categories = useQuery({
    queryKey: ['categories', 'active'] as const,
    queryFn: listMapCategories,
    staleTime: 5 * 60_000,
  });
  const occurrences = useQuery({
    queryKey: [...queryKeys.occurrences, 'map', applied] as const,
    queryFn: ({ signal }) => listActiveAdminOccurrences(applied, signal),
    staleTime: 30_000,
    retry: false,
  });

  const selected = useMemo(
    () => occurrences.data?.find((item) => item.id === selection) ?? null,
    [occurrences.data, selection],
  );

  const mutation = useMutation({
    mutationFn: async ({ id, location }: { id: string; location: GeoPoint }) => {
      // Verificar novamente antes da gravação: estado do mapa pode estar defasado.
      const detail = await getAdminMapOccurrenceDetail(id);
      if (!isActiveStatus(detail.status)) {
        throw new AppError(409, 'TERMINAL_OCCURRENCE', 'Ocorrência em estado terminal.');
      }
      if (!validPoint(location)) {
        throw new AppError(400, 'INVALID_LOCATION', 'Coordenadas inválidas.');
      }
      await adjustAdminOccurrenceLocation(id, location);
    },
    onSuccess: async (_, args) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.occurrences }),
        client.invalidateQueries({ queryKey: queryKeys.occurrence(args.id) }),
      ]);
      setAdjusting(null);
      setCandidate(null);
      setConfirming(false);
      setSelection(null);
    },
  });

  const updateStatus = (status: ActiveStatus, checked: boolean) => {
    setDraft((current) => ({
      ...current,
      statuses: checked
        ? [...new Set([...current.statuses, status])]
        : current.statuses.filter((s) => s !== status),
    }));
  };

  const applyFilters = () => {
    if (!draft.statuses.length) {
      setInputError('Selecione pelo menos um status para mostrar os pontos ativos.');
      return;
    }
    setInputError(null);
    setSelection(null);
    setApplied({ ...draft, statuses: [...draft.statuses], bbox: applied.bbox });
  };

  const clearFilters = () => {
    setDraft(freshDraft());
    setApplied({ ...DEFAULT_FILTERS, statuses: [...ACTIVE_STATUSES] });
    setSelection(null);
    setInputError(null);
  };

  const searchVisibleArea = () => {
    if (!availableBounds) {
      setInputError('Movimente o mapa antes de pesquisar uma região.');
      return;
    }
    try {
      const bbox = validateBounds(availableBounds);
      setInputError(null);
      setSelection(null);
      setApplied((old) => ({ ...old, bbox }));
    } catch {
      setInputError('A região visível não é compatível com o filtro geográfico da API.');
    }
  };
  const clearArea = () => {
    setApplied((old) => ({ ...old, bbox: null }));
    setSelection(null);
  };

  const startAdjustment = (item: AdminMapOccurrence) => {
    if (!isActiveStatus(item.status)) return;
    mutation.reset();
    setAdjusting(item);
    setCandidate({ ...item.location });
    setConfirming(false);
  };
  const cancelAdjustment = () => {
    if (mutation.isPending) return;
    setAdjusting(null);
    setCandidate(null);
    setConfirming(false);
    mutation.reset();
  };
  const requestConfirmation = () => {
    if (!adjusting || !candidate || !validPoint(candidate)) {
      setInputError('Latitude e longitude devem ser números válidos.');
      return;
    }
    setInputError(null);
    setConfirming(true);
  };
  const saveAdjustment = () => {
    if (adjusting && candidate && !mutation.isPending && validPoint(candidate)) {
      mutation.mutate({ id: adjusting.id, location: candidate });
    }
  };

  return {
    categories, occurrences, draft, applied, selected, selection,
    availableBounds, setAvailableBounds, viewport, setViewport, inputError, setInputError,
    setCategory: (categoryId: string) => setDraft((old) => ({ ...old, categoryId })),
    updateStatus, applyFilters, clearFilters, searchVisibleArea, clearArea,
    selectOccurrence: setSelection,
    adjusting, candidate, setCandidate, confirming, setConfirming,
    startAdjustment, cancelAdjustment, requestConfirmation, saveAdjustment,
    mutation,
  };
}

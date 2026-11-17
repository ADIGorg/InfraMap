import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAdminIdentity } from '@/features/auth/hooks/use-admin-identity';
import { queryKeys } from '@/shared/types/query-keys';
import { isAppError, safeErrorMessage } from '@/shared/errors/app-error';
import { AdminOccurrencesService, parseFilters, serializeFilters, type AdminOccurrence, type AdminOccurrenceFilters } from '../services/admin-occurrences.service';
import { startOccurrenceAnalysis } from '../services/moderation.service';

export function useAdminOccurrencesViewModel() {
  const [params, setParams] = useSearchParams();
  const parsed = parseFilters(params);
  const filters = parsed.success ? parsed.data : undefined;
  const identity = useAdminIdentity();
  const canAct = identity.isSuccess && identity.data.role === 'ADMIN' && identity.data.is_active;
  const client = useQueryClient();
  const [selected, setSelected] = useState<AdminOccurrence | null>(null);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
  const submitting = useRef(false);
  const list = useQuery({
    queryKey: [...queryKeys.occurrences, 'list', filters],
    queryFn: ({ signal }) => AdminOccurrencesService.list(filters!, signal),
    enabled: !!filters && canAct,
  });
  const categories = useQuery({
    queryKey: ['categories'], queryFn: ({ signal }) => AdminOccurrencesService.categories(signal),
    enabled: canAct,
  });
  const changeFilters = (updates: Partial<AdminOccurrenceFilters>) => {
    setParams(serializeFilters({ page: 1, pageSize: 20, sort: 'recent', ...filters, ...updates }));
  };
  const pagination = list.data?.pagination;
  useEffect(() => {
    if (filters && pagination && list.isSuccess && filters.page > Math.max(1, pagination.totalPages)) {
      setParams(serializeFilters({ ...filters, page: Math.max(1, pagination.totalPages) }), { replace: true });
    }
  }, [filters, pagination, list.isSuccess, setParams]);
  const mutation = useMutation({
    mutationFn: startOccurrenceAnalysis,
    onSuccess: () => {
      setSelected(null);
      setNotice({ error: false, text: 'Análise iniciada com sucesso.' });
    },
    onError: error => {
      setSelected(null);
      setNotice({ error: true, text: isAppError(error) && error.statusCode === 409
        ? 'A ocorrência foi alterada por outro administrador. A lista foi atualizada. Confira o status antes de continuar.'
        : safeErrorMessage(error) });
    },
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.occurrences }),
        client.invalidateQueries({ queryKey: queryKeys.dashboard }),
      ]);
      submitting.current = false;
    },
  });
  const confirmAnalysis = () => {
    if (!selected || selected.status !== 'RECEIVED' || !canAct || submitting.current) return;
    submitting.current = true;
    mutation.mutate(selected.id);
  };
  return {
    filters, filterError: parsed.success ? null : parsed.error.issues.map(issue => issue.message).join(' '),
    list, categories, canAct, identity, selected, setSelected, notice,
    isPending: mutation.isPending, confirmAnalysis, changeFilters,
    clearFilters: () => setParams(new URLSearchParams()),
    requestAnalysis: (item: AdminOccurrence) => {
      if (canAct && item.status === 'RECEIVED' && !mutation.isPending) {
        setNotice(null);
        setSelected(item);
      }
    },
  };
}


import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { filtersSchema, statusOptions, type AdminOccurrenceFilters } from '../services/admin-occurrences.service';
import { listNeighborhoods } from '../services/extra-filters';

const allStatuses = statusOptions.map(([value]) => value);

// Nenhum status específico selecionado significa "Todos" (sem filtro na API).
// Links antigos com todos os status explícitos também são normalizados.
function selectedStatuses(statuses?: AdminOccurrenceFilters['status']) {
  return !statuses || statuses.length === allStatuses.length ? [] : statuses;
}

export function occurrenceFilterDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function useOccurrenceFilterForm(filters: AdminOccurrenceFilters, categoriesUnavailable: boolean,
  onChange: (value: Partial<AdminOccurrenceFilters>) => void) {
  const [error, setError] = useState('');
  const [draft, setDraft] = useState(() => ({ ...filters, status: selectedStatuses(filters.status) }));
  const initialFrom = occurrenceFilterDate(filters.createdFrom);
  const initialUntil = occurrenceFilterDate(filters.createdBefore);
  const [from, setFrom] = useState(initialFrom);
  const [until, setUntil] = useState(initialUntil);
  const [period, setPeriod] = useState(filters.createdFrom || filters.createdBefore ? 'custom' : 'all');
  const snapshot = (value: AdminOccurrenceFilters, start: string, end: string) => JSON.stringify([
    value.q?.trim() || '', value.categoryId ?? '', value.priority ?? '', value.neighborhoodId ?? '',
    [...selectedStatuses(value.status)].sort(), value.sort, value.pageSize, start, end,
  ]);
  const hasChanges = snapshot(draft, from, until) !== snapshot(filters, initialFrom, initialUntil);
  const neighborhoods = useQuery({ queryKey: ['admin', 'neighborhoods'], queryFn: listNeighborhoods, retry: false, staleTime: 300_000 });
  function setPreset(value: string) {
    setPeriod(value);
    if (value === 'custom') return;
    if (value === 'all') { setFrom(''); setUntil(''); return; }
    const end = new Date(); end.setSeconds(0, 0);
    const start = new Date(end); start.setDate(start.getDate() - Number(value));
    setFrom(occurrenceFilterDate(start.toISOString())); setUntil(occurrenceFilterDate(end.toISOString()));
  }
  function setStatus(status: NonNullable<AdminOccurrenceFilters['status']>[number], checked: boolean) {
    setError('');
    setDraft(current => {
      const next = checked
        ? [...new Set([...current.status, status])]
        : current.status.filter(item => item !== status);
      // Nenhum selecionado ou todos selecionados = busca sem restrição de status.
      return { ...current, status: next.length === allStatuses.length ? [] : next };
    });
  }
  function selectAllStatuses() {
    setError('');
    setDraft(current => ({ ...current, status: [] }));
  }
  function reset() {
    setDraft({ ...filtersSchema.parse({}), status: [] });
    setFrom(''); setUntil(''); setPeriod('all'); setError('');
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasChanges) return;
    const dates: Record<string, string | undefined> = {};
    for (const key of ['createdFrom', 'createdBefore'] as const) {
      const value = key === 'createdFrom' ? from : until;
      if (!value) { dates[key] = undefined; continue; }
      const date = new Date(value);
      if (!Number.isFinite(date.getTime())) { setError('Informe uma data válida.'); return; }
      dates[key] = value === occurrenceFilterDate(filters[key]) ? filters[key] : date.toISOString();
    }
    const parsed = filtersSchema.safeParse({
      ...draft, page: 1, q: draft.q?.trim() || undefined,
      status: draft.status.length === 0 || draft.status.length === allStatuses.length ? undefined : draft.status,
      categoryId: categoriesUnavailable ? filters.categoryId : draft.categoryId,
      neighborhoodId: neighborhoods.data?.length ? draft.neighborhoodId : filters.neighborhoodId, ...dates,
    });
    if (!parsed.success) { setError(parsed.error.issues.map(issue => issue.message).join(' ')); return; }
    setError(''); onChange(parsed.data);
  }
  return { neighborhoods, error, submit, draft, setDraft, from, setFrom, until, setUntil, period, setPreset, setStatus, selectAllStatuses, hasChanges, reset };
}

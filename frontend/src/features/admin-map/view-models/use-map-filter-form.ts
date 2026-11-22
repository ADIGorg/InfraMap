import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { extraFiltersSchema, listNeighborhoods } from '@/features/occurrences/services/extra-filters';
import { DEFAULT_FILTERS, validateBounds, type ActiveStatus, type Bounds, type MapFilters } from '../services/admin-occurrences.service';

export function localFilterDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function filterSnapshot(filters: MapFilters, from: string, until: string) {
  return JSON.stringify([
    filters.q?.trim() || '', filters.categoryId, [...filters.statuses].sort(),
    filters.priority ?? '', filters.neighborhoodId ?? '', from, until,
    filters.bbox ? [filters.bbox.minLat, filters.bbox.maxLat, filters.bbox.minLng, filters.bbox.maxLng] : null,
  ]);
}

export function useMapFilterForm(initial: MapFilters, onApply: (filters: MapFilters) => void) {
  const [draft, setDraft] = useState<MapFilters>(() => ({ ...initial, statuses: [...initial.statuses] }));
  const [from, setFrom] = useState(() => localFilterDate(initial.createdFrom));
  const [until, setUntil] = useState(() => localFilterDate(initial.createdBefore));
  const [period, setPeriod] = useState(initial.createdFrom || initial.createdBefore ? 'custom' : 'all');
  const [neighborhoodSearch, setNeighborhoodSearch] = useState('');
  const [error, setError] = useState('');
  const initialFrom = localFilterDate(initial.createdFrom);
  const initialUntil = localFilterDate(initial.createdBefore);
  const hasChanges = filterSnapshot(draft, from, until) !== filterSnapshot(initial, initialFrom, initialUntil);
  const neighborhoods = useQuery({ queryKey: ['admin', 'neighborhoods'], queryFn: listNeighborhoods, retry: false, staleTime: 300_000 });

  function setStatus(status: ActiveStatus, checked: boolean) {
    setDraft(current => ({ ...current, statuses: checked ? [...new Set([...current.statuses, status])] : current.statuses.filter(value => value !== status) }));
  }
  function setArea(bounds: Bounds | null) {
    try {
      const bbox = bounds ? validateBounds(bounds) : null;
      setDraft(current => ({ ...current, bbox }));
      setError('');
    } catch { setError('A área visível é inválida. Movimente o mapa e tente novamente.'); }
  }
  function setPreset(value: string) {
    setPeriod(value);
    if (value === 'custom') return;
    if (value === 'all') { setFrom(''); setUntil(''); return; }
    const end = new Date(); end.setSeconds(0, 0);
    const start = new Date(end); start.setDate(start.getDate() - Number(value));
    setFrom(localFilterDate(start.toISOString())); setUntil(localFilterDate(end.toISOString()));
  }
  function reset() {
    setDraft({ ...DEFAULT_FILTERS, statuses: [...DEFAULT_FILTERS.statuses] });
    setFrom(''); setUntil(''); setPeriod('all'); setNeighborhoodSearch(''); setError('');
  }
  function apply() {
    if (!hasChanges) return;
    if (!draft.statuses.length) { setError('Selecione pelo menos um status.'); return; }
    const start = from ? new Date(from) : null;
    const end = until ? new Date(until) : null;
    if ((start && !Number.isFinite(start.getTime())) || (end && !Number.isFinite(end.getTime()))) { setError('Informe uma data válida.'); return; }
    const parsed = extraFiltersSchema.safeParse({ ...draft, q: draft.q?.trim() || undefined,
      createdFrom: from === initialFrom ? initial.createdFrom : start?.toISOString(),
      createdBefore: until === initialUntil ? initial.createdBefore : end?.toISOString() });
    if (!parsed.success) { setError(parsed.error.issues.map(issue => issue.message).join(' ')); return; }
    setError(''); onApply({ ...draft, ...parsed.data });
  }
  return { draft, setDraft, from, setFrom, until, setUntil, period, setPreset, neighborhoodSearch, setNeighborhoodSearch, neighborhoods, error, hasChanges, setStatus, setArea, reset, apply };
}

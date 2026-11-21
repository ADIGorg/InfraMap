import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/shared/components/button';
import { Select } from '@/shared/components/select';
import { extraFiltersSchema, listNeighborhoods, type ExtraFilters } from '../services/extra-filters';

const localDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
export function ExtraOccurrenceFilters({ filters, onApply, compact = false, formId, showApplyButton = true }: {
  filters: ExtraFilters; onApply: (filters: ExtraFilters) => void; compact?: boolean;
  formId?: string; showApplyButton?: boolean;
}) {
  const [error, setError] = useState('');
  const neighborhoods = useQuery({ queryKey: ['admin', 'neighborhoods'], queryFn: listNeighborhoods, retry: false, staleTime: 300_000 });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const values = Object.fromEntries(['priority', 'q', 'neighborhoodId', 'createdFrom', 'createdBefore'].map(key => [key, String(data.get(key) ?? '').trim() || undefined]));
    if (!neighborhoods.data?.length) values.neighborhoodId = filters.neighborhoodId;
    for (const key of ['createdFrom', 'createdBefore']) {
      if (values[key]) {
        const date = new Date(values[key]);
        if (!Number.isFinite(date.getTime())) { setError('Data inválida.'); return; }
        values[key] = date.toISOString();
      }
    }
    const parsed = extraFiltersSchema.safeParse(values);
    if (!parsed.success) { setError(parsed.error.issues.map(issue => issue.message).join(' ')); return; }
    setError(''); onApply(parsed.data);
  }
  return <form id={formId} onSubmit={submit} className="space-y-3 rounded-xl border border-line-subtle bg-white p-4">
    <div className={compact ? 'grid gap-3' : 'grid gap-3 sm:grid-cols-2'}>
      <label className="field-label">Buscar por ID, categoria ou descrição<input className="field-input" name="q" maxLength={200} defaultValue={filters.q ?? ''} /></label>
      <label className="field-label">Prioridade<Select name="priority" defaultValue={filters.priority ?? ''}
        options={[{ value: '', label: 'Todas' }, { value: 'HIGH', label: 'Alta' }, { value: 'MEDIUM', label: 'Média' }, { value: 'LOW', label: 'Baixa' }, { value: 'UNDEFINED', label: 'Não definida' }]} /></label>
      <label className="field-label">Bairro<Select name="neighborhoodId" defaultValue={filters.neighborhoodId ?? ''} disabled={!neighborhoods.data?.length}
        options={[{ value: '', label: 'Todos os bairros' },
          ...(filters.neighborhoodId && !neighborhoods.data?.some(n => n.id === filters.neighborhoodId) ? [{ value: filters.neighborhoodId, label: 'Bairro selecionado' }] : []),
          ...(neighborhoods.data ?? []).map(n => ({ value: n.id, label: `${n.name} — ${n.municipality}` }))]} /></label>
      <div className="space-y-2">
        <label className="field-label">Início do período (inclusivo)<input className="field-input" type="datetime-local" name="createdFrom" defaultValue={localDate(filters.createdFrom)} /></label>
        <label className="field-label">Fim do período (exclusivo)<input className="field-input" type="datetime-local" name="createdBefore" defaultValue={localDate(filters.createdBefore)} /></label>
      </div>
    </div>
    <p className="text-xs text-ink-secondary">Datas no fuso do navegador ({Intl.DateTimeFormat().resolvedOptions().timeZone}). Filtros aplicados a todos os registros no servidor.</p>
    {neighborhoods.isError && <p role="alert" className="text-xs">Não foi possível carregar bairros. <button type="button" className="underline" onClick={() => void neighborhoods.refetch()}>Tentar novamente</button></p>}
    {neighborhoods.isSuccess && !neighborhoods.data.length && <p className="text-xs text-ink-secondary">Nenhum limite de bairro cadastrado. Utilize a região geográfica.</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {showApplyButton && <Button type="submit">Aplicar busca, prioridade e período</Button>}
  </form>;
}

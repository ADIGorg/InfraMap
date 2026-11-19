import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/shared/components/button';
import { extraFiltersSchema, listNeighborhoods, type ExtraFilters } from '../services/extra-filters';

const localDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
export function ExtraOccurrenceFilters({ filters, onApply, compact = false }: { filters: ExtraFilters; onApply: (filters: ExtraFilters) => void; compact?: boolean }) {
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
  return <form onSubmit={submit} className="space-y-3 rounded-xl border border-line-subtle bg-white p-4">
    <div className={compact ? 'grid gap-3' : 'grid gap-3 sm:grid-cols-2'}>
      <label className="field-label">Buscar por ID, categoria ou descrição<input className="field-input" name="q" maxLength={200} defaultValue={filters.q ?? ''} /></label>
      <label className="field-label">Prioridade<select className="field-input" name="priority" defaultValue={filters.priority ?? ''}>
        <option value="">Todas</option><option value="HIGH">Alta</option><option value="MEDIUM">Média</option><option value="LOW">Baixa</option><option value="UNDEFINED">Não definida</option>
      </select></label>
      <label className="field-label">Bairro<select name="neighborhoodId" className="field-input" defaultValue={filters.neighborhoodId ?? ''} disabled={!neighborhoods.data?.length}>
        <option value="">Todos os bairros</option>
        {filters.neighborhoodId && !neighborhoods.data?.some(n => n.id === filters.neighborhoodId) && <option value={filters.neighborhoodId}>Bairro selecionado</option>}
        {neighborhoods.data?.map(n => <option key={n.id} value={n.id}>{n.name} — {n.municipality}</option>)}
      </select></label>
      <div className="space-y-2">
        <label className="field-label">Início do período (inclusivo)<input className="field-input" type="datetime-local" name="createdFrom" defaultValue={localDate(filters.createdFrom)} /></label>
        <label className="field-label">Fim do período (exclusivo)<input className="field-input" type="datetime-local" name="createdBefore" defaultValue={localDate(filters.createdBefore)} /></label>
      </div>
    </div>
    <p className="text-xs text-ink-secondary">Datas no fuso do navegador ({Intl.DateTimeFormat().resolvedOptions().timeZone}). Filtros aplicados a todos os registros no servidor.</p>
    {neighborhoods.isError && <p role="alert" className="text-xs">Não foi possível carregar bairros. <button type="button" className="underline" onClick={() => void neighborhoods.refetch()}>Tentar novamente</button></p>}
    {neighborhoods.isSuccess && !neighborhoods.data.length && <p className="text-xs text-ink-secondary">Nenhum limite de bairro cadastrado. Utilize a região geográfica.</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <Button type="submit">Aplicar busca, prioridade e período</Button>
  </form>;
}

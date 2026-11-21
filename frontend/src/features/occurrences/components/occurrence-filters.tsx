import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { Select } from '@/shared/components/select';
import { statusOptions, type AdminOccurrenceFilters } from '../services/admin-occurrences.service';
import { useOccurrenceFilterForm } from '../view-models/use-occurrence-filter-form';

interface Props {
  filters: AdminOccurrenceFilters;
  categories: Array<{ id: string; name: string }>;
  categoriesUnavailable: boolean;
  onChange: (value: Partial<AdminOccurrenceFilters>) => void;
  onClear: () => void;
}

export function OccurrenceFilters({ filters, categories, categoriesUnavailable, onChange, onClear }: Props) {
  const form = useOccurrenceFilterForm(filters, categoriesUnavailable, onChange);
  const { neighborhoods, error, submit, draft, setDraft } = form;
  const neighborhoodsList = neighborhoods.data ?? [];
  const multipleMunicipalities = new Set(neighborhoodsList.map(item => item.municipality)).size > 1;
  return <section aria-label="Filtros de ocorrências" className="mb-5 rounded-2xl border border-line-subtle bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-subtle px-4 py-3 md:px-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink-primary"><SlidersHorizontal size={17} className="text-brand-primary" aria-hidden="true" />Filtros de ocorrências</div>
      <Button type="button" variant="ghost" className="min-h-8 px-2 py-1 text-xs" onClick={() => { form.reset(); onClear(); }}><RotateCcw size={14} aria-hidden="true" />Limpar filtros</Button>
    </div>
    <form onSubmit={submit}>
      <div className="space-y-4 p-4 md:p-5">
        <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="block text-xs font-semibold text-ink-secondary">Buscar ocorrência
            <input className="field-input mt-1.5 font-normal" name="q" aria-label="Buscar por ID, categoria ou descrição" placeholder="ID ou palavra-chave" maxLength={200} value={draft.q ?? ''} onChange={event => setDraft(current => ({ ...current, q: event.target.value }))} />
          </label>
          <label className="block min-w-0 text-xs font-semibold text-ink-secondary">Categoria
            <Select className="mt-1.5" name="categoryId" value={draft.categoryId ?? ''} onValueChange={value => setDraft(current => ({ ...current, categoryId: value || undefined }))} disabled={categoriesUnavailable}
              options={[{ value: '', label: 'Todas as categorias' },
                ...(filters.categoryId && !categories.some(category => category.id === filters.categoryId) ? [{ value: filters.categoryId, label: 'Categoria selecionada' }] : []),
                ...categories.map(category => ({ value: category.id, label: category.name }))]} />
          </label>
          <label className="block min-w-0 text-xs font-semibold text-ink-secondary">Prioridade
            <Select className="mt-1.5" name="priority" value={draft.priority ?? ''} onValueChange={value => setDraft(current => ({ ...current, priority: value as AdminOccurrenceFilters['priority'] || undefined }))}
              options={[{ value: '', label: 'Todas' }, { value: 'HIGH', label: 'Alta' }, { value: 'MEDIUM', label: 'Média' }, { value: 'LOW', label: 'Baixa' }, { value: 'UNDEFINED', label: 'Não definida' }]} />
          </label>
          <label className="block min-w-0 text-xs font-semibold text-ink-secondary">Bairro
            <Select className="mt-1.5" name="neighborhoodId" value={draft.neighborhoodId ?? ''} onValueChange={value => setDraft(current => ({ ...current, neighborhoodId: value || undefined }))} disabled={!neighborhoodsList.length}
              options={[{ value: '', label: 'Todos os bairros' },
                ...(filters.neighborhoodId && !neighborhoodsList.some(item => item.id === filters.neighborhoodId) ? [{ value: filters.neighborhoodId, label: 'Bairro selecionado' }] : []),
                ...neighborhoodsList.map(item => ({ value: item.id, label: multipleMunicipalities ? `${item.name} — ${item.municipality}` : item.name }))]} />
          </label>
        </div>
        {neighborhoods.isError && <p role="alert" className="text-xs text-red-700">Não foi possível carregar bairros. <button type="button" className="underline" onClick={() => void neighborhoods.refetch()}>Tentar novamente</button></p>}
        {neighborhoods.isSuccess && !neighborhoodsList.length && <p className="text-xs text-ink-secondary">Nenhum bairro cadastrado para filtragem.</p>}
        <fieldset>
          <legend className="text-xs font-semibold text-ink-secondary">Período</legend>
            <div className="mt-2 grid gap-3 md:grid-cols-3">
              <label className="block text-xs text-ink-secondary">Intervalo<Select className="mt-1" value={form.period} onValueChange={form.setPreset}
                options={[{ value: 'all', label: 'Qualquer período' }, { value: '7', label: 'Últimos 7 dias' }, { value: '30', label: 'Últimos 30 dias' }, { value: 'custom', label: 'Personalizado' }]} /></label>
              <label className="block text-xs text-ink-secondary">De<input aria-label="Início do período (inclusivo)" className="field-input mt-1" type="datetime-local" name="createdFrom" value={form.from} onChange={event => { form.setFrom(event.target.value); form.setPreset('custom'); }} /></label>
              <label className="block text-xs text-ink-secondary">Até<input aria-label="Fim do período (exclusivo)" className="field-input mt-1" type="datetime-local" name="createdBefore" value={form.until} onChange={event => { form.setUntil(event.target.value); form.setPreset('custom'); }} /></label>
            </div>
            <p className="mt-2 text-xs text-ink-secondary">Inclui o horário inicial e considera registros anteriores ao horário final. Horários locais ({Intl.DateTimeFormat().resolvedOptions().timeZone}).</p>
        </fieldset>
        <fieldset className="border-t border-line-subtle pt-3">
          <legend className="pr-2 text-xs font-semibold text-ink-secondary">Status</legend>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map(([value, label]) => <label key={value} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-line px-3 text-xs text-ink-primary has-[:checked]:border-brand-primary/40 has-[:checked]:bg-surface-info has-[:checked]:text-brand-primary">
              <input type="checkbox" name="status" value={value} checked={draft.status?.includes(value) ?? false} onChange={event => form.setStatus(value, event.target.checked)} className="h-3.5 w-3.5 accent-brand-primary" />{label}
            </label>)}
          </div>
          <p className="mt-2 text-xs text-ink-secondary">Todos os status vêm selecionados. Desmarque os que deseja excluir.</p>
        </fieldset>
        {error && form.hasChanges && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>
      <footer className="flex flex-wrap items-end justify-between gap-3 border-t border-line-subtle px-4 py-3 md:px-5">
        <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-[minmax(180px,240px)_110px]">
          <label className="block text-xs font-semibold text-ink-secondary">Ordenação
            <Select className="mt-1" name="sort" value={draft.sort} onValueChange={value => setDraft(current => ({ ...current, sort: value as AdminOccurrenceFilters['sort'] }))} options={[{ value: 'recent', label: 'Mais recentes' }, { value: 'oldest', label: 'Mais antigas' }, { value: 'most_liked', label: 'Mais curtidas' }]} />
          </label>
          <label className="block text-xs font-semibold text-ink-secondary">Por página
            <Select className="mt-1" name="pageSize" value={String(draft.pageSize)} onValueChange={value => setDraft(current => ({ ...current, pageSize: Number(value) }))} options={Array.from(new Set([10, 20, 50, 100, filters.pageSize])).sort((a, b) => a - b).map(size => ({ value: String(size), label: String(size) }))} />
          </label>
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto">
          <span className="text-xs text-ink-secondary">{form.hasChanges ? 'Há alterações pendentes.' : 'Nenhuma alteração pendente.'}</span>
          <Button type="submit" disabled={!form.hasChanges}>Aplicar filtros</Button>
        </div>
      </footer>
    </form>
  </section>;
}

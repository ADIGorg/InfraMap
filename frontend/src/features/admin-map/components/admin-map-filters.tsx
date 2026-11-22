import { RotateCcw } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { Select } from '@/shared/components/select';
import { ACTIVE_STATUSES, type ActiveStatus, type Bounds, type MapCategory, type MapFilters } from '../services/admin-occurrences.service';
import { useMapFilterForm } from '../view-models/use-map-filter-form';
import { NeighborhoodSuggestions } from './neighborhood-suggestions';

const LABELS: Record<ActiveStatus, string> = { RECEIVED: 'Recebido', UNDER_ANALYSIS: 'Em análise', CONFIRMED: 'Confirmado', IN_SERVICE: 'Em atendimento' };
const COLORS: Record<ActiveStatus, string> = { RECEIVED: 'bg-slate-400', UNDER_ANALYSIS: 'bg-amber-400', CONFIRMED: 'bg-sky-500', IN_SERVICE: 'bg-orange-500' };
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
const describeBounds = (bounds: Bounds) => `${bounds.minLat.toFixed(3)} a ${bounds.maxLat.toFixed(3)} latitude, ${bounds.minLng.toFixed(3)} a ${bounds.maxLng.toFixed(3)} longitude.`;

interface MapFiltersProps {
  initial: MapFilters;
  visibleBounds: Bounds | null;
  categories?: MapCategory[];
  categoriesLoading: boolean;
  categoriesError: boolean;
  canSearchArea: boolean;
  onApply: (filters: MapFilters) => void;
  onClear: () => void;
}

export function AdminMapFilters({ initial, visibleBounds, categories, categoriesLoading, categoriesError, canSearchArea, onApply, onClear }: MapFiltersProps) {
  const form = useMapFilterForm(initial, onApply);
  const { draft, setDraft, neighborhoods } = form;
  const options = neighborhoods.data ?? [];
  const multipleMunicipalities = new Set(options.map(item => item.municipality)).size > 1;
  const matching = options.filter(item => normalize(item.name + ' ' + item.municipality).includes(normalize(form.neighborhoodSearch)));
  const selected = options.find(item => item.id === draft.neighborhoodId);
  const neighborhoodLabel = (item: typeof options[number]) => multipleMunicipalities ? `${item.name} — ${item.municipality}` : item.name;
  const viewportDiffers = visibleBounds && draft.bbox && (['minLat', 'maxLat', 'minLng', 'maxLng'] as const).some(key => Math.abs(visibleBounds[key] - draft.bbox![key]) > 0.0001);

  return <form aria-label="Filtros avançados" className="flex min-h-0 flex-1 flex-col" onSubmit={event => { event.preventDefault(); form.apply(); }}>
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
      <p className="text-xs text-ink-secondary">Escolha os critérios e clique em Aplicar filtros. Fechar descarta alterações não aplicadas.</p>
      <div>
        <label htmlFor="admin-map-category" className="field-label">Categoria da ocorrência</label>
        <Select id="admin-map-category" value={draft.categoryId} onValueChange={categoryId => setDraft(current => ({ ...current, categoryId }))} disabled={categoriesLoading || categoriesError}
          options={[{ value: '', label: 'Todas as categorias' }, ...(categories ?? []).map(category => ({ value: category.id, label: category.name }))]} />
        {categoriesError && <p role="alert" className="mt-2 text-xs text-red-700">Não foi possível carregar as categorias. Os outros filtros continuam disponíveis.</p>}
      </div>
      <fieldset>
        <legend className="field-label">Status ativo</legend>
        <div className="grid grid-cols-2 gap-2">
          {ACTIVE_STATUSES.map(status => <label key={status} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-line px-2 text-xs text-ink-primary">
            <input type="checkbox" checked={draft.statuses.includes(status)} onChange={event => form.setStatus(status, event.target.checked)} className="h-4 w-4 shrink-0 accent-brand-primary" />
            <span aria-hidden="true" className={'h-2 w-2 shrink-0 rounded-full ' + COLORS[status]} />{LABELS[status]}
          </label>)}
        </div>
        <p className="mt-2 text-xs text-ink-secondary">Resolvidas e rejeitadas ficam na lista e no histórico.</p>
      </fieldset>
      <label className="field-label">Prioridade
        <Select className="mt-1" value={draft.priority ?? ''} onValueChange={priority => setDraft(current => ({ ...current, priority: priority as MapFilters['priority'] || undefined }))}
          options={[{ value: '', label: 'Todas' }, { value: 'HIGH', label: 'Alta' }, { value: 'MEDIUM', label: 'Média' }, { value: 'LOW', label: 'Baixa' }, { value: 'UNDEFINED', label: 'Não definida' }]} />
      </label>
      <fieldset className="space-y-2">
        <legend className="field-label">Bairro</legend>
        <NeighborhoodSuggestions query={form.neighborhoodSearch} onQueryChange={form.setNeighborhoodSearch} disabled={!options.length}
          options={matching.map(item => ({ value: item.id, label: neighborhoodLabel(item) }))} selected={draft.neighborhoodId}
          onSelect={neighborhoodId => setDraft(current => ({ ...current, neighborhoodId }))} />
        <label className="sr-only" htmlFor="admin-map-neighborhood">Selecionar bairro</label>
        <Select id="admin-map-neighborhood" value={draft.neighborhoodId ?? ''} disabled={!options.length} onValueChange={neighborhoodId => setDraft(current => ({ ...current, neighborhoodId: neighborhoodId || undefined }))}
          options={[{ value: '', label: 'Todos os bairros' },
            ...(draft.neighborhoodId && !matching.some(item => item.id === draft.neighborhoodId) ? [{ value: draft.neighborhoodId, label: selected ? neighborhoodLabel(selected) : 'Bairro selecionado' }] : []),
            ...matching.map(item => ({ value: item.id, label: neighborhoodLabel(item) }))]} />
        {form.neighborhoodSearch && !matching.length && <p role="status" className="text-xs text-ink-secondary">Nenhum bairro encontrado. A seleção atual foi mantida.</p>}
        {neighborhoods.isPending && <p role="status" className="text-xs text-ink-secondary">Carregando bairros…</p>}
        {neighborhoods.isError && <p role="alert" className="text-xs text-red-700">Não foi possível carregar os bairros. <button type="button" className="underline" onClick={() => void neighborhoods.refetch()}>Tentar novamente</button></p>}
        {neighborhoods.isSuccess && !options.length && <p className="text-xs text-ink-secondary">Nenhum limite de bairro cadastrado.</p>}
      </fieldset>
      <details className="border-t border-line pt-3">
        <summary className="cursor-pointer text-sm font-semibold text-ink-primary">Período{form.from || form.until ? ' · definido' : ''}</summary>
        <div className="mt-3 space-y-3">
          <label className="field-label">Intervalo
            <Select className="mt-1" value={form.period} onValueChange={form.setPreset}
              options={[{ value: 'all', label: 'Qualquer período' }, { value: '7', label: 'Últimos 7 dias' }, { value: '30', label: 'Últimos 30 dias' }, { value: 'custom', label: 'Personalizado' }]} />
          </label>
          <label className="field-label">De<input className="field-input mt-1" type="datetime-local" value={form.from} onChange={event => { form.setFrom(event.target.value); form.setPreset('custom'); }} /></label>
          <label className="field-label">Até<input className="field-input mt-1" type="datetime-local" value={form.until} onChange={event => { form.setUntil(event.target.value); form.setPreset('custom'); }} /></label>
          <p className="text-xs text-ink-secondary">Inclui o horário inicial e considera registros anteriores ao horário final. Horários locais ({Intl.DateTimeFormat().resolvedOptions().timeZone}).</p>
        </div>
      </details>
      <details className="border-t border-line pt-3">
        <summary className="cursor-pointer text-sm font-semibold text-ink-primary">Região geográfica{draft.bbox ? ' · restrita' : ''}</summary>
        <div className="mt-3 space-y-3">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-brand-primary" checked={!!draft.bbox} disabled={!draft.bbox && !canSearchArea} onChange={event => form.setArea(event.target.checked ? visibleBounds : null)} />
            <span>Restringir à área visível do mapa</span>
          </label>
          <p className="text-xs text-ink-secondary">A área é combinada com o bairro e os demais filtros. Uma ocorrência precisa atender a todos os critérios.</p>
          <p className="text-xs text-ink-secondary">Ao marcar, usamos o enquadramento do mapa antes de abrir este painel.</p>
          {!canSearchArea && <p className="text-xs text-ink-secondary">Volte à visualização do mapa para selecionar uma nova área.</p>}
          {viewportDiffers && <p className="text-xs text-amber-800">O mapa foi movimentado desde a seleção da área. A restrição anterior foi mantida. Para usar o enquadramento atual, desmarque e marque novamente esta opção.</p>}
          {(draft.bbox || visibleBounds) && <details className="text-xs text-ink-secondary">
            <summary className="cursor-pointer">Ver coordenadas</summary>
            {draft.bbox && <p className="mt-2">Região selecionada: {describeBounds(draft.bbox)}</p>}
            {visibleBounds && <p className="mt-2">Área atualmente visível: {describeBounds(visibleBounds)}</p>}
          </details>}
        </div>
      </details>
    </div>
    <footer className="shrink-0 space-y-2 border-t border-line bg-white px-5 py-3">
      {form.error && form.hasChanges && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{form.error}</p>}
      <Button type="submit" className="w-full" disabled={!form.hasChanges}>Aplicar filtros</Button>
      <Button type="button" className="w-full" variant="outline" onClick={() => { form.reset(); onClear(); }}><RotateCcw size={16} aria-hidden="true" />Limpar filtros</Button>
      <p className="text-center text-xs text-ink-secondary">{form.hasChanges ? 'Há alterações pendentes. Clique em Aplicar filtros.' : 'Nenhuma alteração pendente.'}</p>
    </footer>
  </form>;
}

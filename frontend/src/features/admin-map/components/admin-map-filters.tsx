import { MapPinned, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { ACTIVE_STATUSES, type ActiveStatus, type Bounds, type MapCategory } from '../services/admin-occurrences.service';
import { ExtraOccurrenceFilters } from '@/features/occurrences/components/extra-occurrence-filters';
import type { ExtraFilters } from '@/features/occurrences/services/extra-filters';

const LABELS: Record<ActiveStatus, string> = {
  RECEIVED: 'Recebido',
  UNDER_ANALYSIS: 'Em análise',
  CONFIRMED: 'Confirmado',
  IN_SERVICE: 'Em atendimento',
};

const COLORS: Record<ActiveStatus, string> = {
  RECEIVED: 'bg-slate-400',
  UNDER_ANALYSIS: 'bg-amber-400',
  CONFIRMED: 'bg-sky-500',
  IN_SERVICE: 'bg-orange-500',
};

interface MapFiltersProps {
  draft: ExtraFilters & { statuses: ActiveStatus[]; categoryId: string };
  onExtraChange?: (filters: ExtraFilters) => void;
  appliedBounds: Bounds | null;
  visibleBounds: Bounds | null;
  categories?: MapCategory[];
  categoriesLoading: boolean;
  categoriesError: boolean;
  canSearchArea: boolean;
  error: string | null;
  onStatusChange: (status: ActiveStatus, checked: boolean) => void;
  onCategoryChange: (id: string) => void;
  onApply: () => void;
  onClear: () => void;
  onSearchArea: () => void;
  onClearArea: () => void;
}

export function AdminMapFilters({
  draft, appliedBounds, visibleBounds, categories, categoriesLoading, categoriesError,
  canSearchArea, error, onStatusChange, onCategoryChange,
  onApply, onClear, onSearchArea, onClearArea, onExtraChange,
}: MapFiltersProps) {
  const viewportDiffers = Boolean(
    visibleBounds && appliedBounds &&
    (['minLat', 'maxLat', 'minLng', 'maxLng'] as const)
      .some((key) => Math.abs(visibleBounds[key] - appliedBounds[key]) > 0.0001),
  );
  return (
    <aside aria-label="Filtros avançados" className="w-full shrink-0 space-y-5 border-t border-line bg-white p-5 lg:h-full lg:min-h-0 lg:w-[320px] lg:overflow-y-auto lg:overscroll-contain lg:border-l lg:border-t-0">
      <h2 className="flex items-center gap-2 text-lg font-bold text-ink-primary">
        <SlidersHorizontal size={20} aria-hidden="true" />
        Filtros avançados
      </h2>
      <div>
        <label htmlFor="admin-map-category" className="field-label">Categoria da ocorrência</label>
        <select id="admin-map-category" className="field-input"
          value={draft.categoryId} onChange={(event) => onCategoryChange(event.target.value)}
          disabled={categoriesLoading || categoriesError}>
          <option value="">Todas as categorias</option>
          {categories?.map((category) => (
            <option value={category.id} key={category.id}>{category.name}</option>
          ))}
        </select>
        {categoriesError && (
          <p role="alert" className="mt-2 text-xs text-red-700">
            Não foi possível carregar as categorias. Utilize o filtro de status.
          </p>
        )}
      </div>
      <fieldset>
        <legend className="field-label">Filtrar por status ativo</legend>
        <div className="space-y-3">
          {ACTIVE_STATUSES.map((status) => (
            <label key={status} className="flex cursor-pointer items-center gap-3 text-sm text-ink-primary">
              <input type="checkbox" checked={draft.statuses.includes(status)}
                onChange={(event) => onStatusChange(status, event.target.checked)}
                className="h-4 w-4 accent-brand-primary" />
              <span aria-hidden="true" className={'h-2.5 w-2.5 rounded-full ' + COLORS[status]} />
              {LABELS[status]}
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-secondary">
          Resolvidas e rejeitadas permanecem na lista e no histórico, não no mapa ativo.
        </p>
      </fieldset>

      <section className="space-y-3 border-t border-line pt-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-primary">
          <MapPinned size={16} aria-hidden="true" /> Região geográfica
        </h3>
        {appliedBounds ? (
          <p role="status" className="rounded-lg bg-surface-page p-3 text-xs text-ink-secondary">
            Região do mapa aplicada: {appliedBounds.minLat.toFixed(3)} a {appliedBounds.maxLat.toFixed(3)} latitude,
            {' '}{appliedBounds.minLng.toFixed(3)} a {appliedBounds.maxLng.toFixed(3)} longitude.
          </p>
        ) : (
          <p className="text-xs text-ink-secondary">Sem filtro geográfico: todas as áreas disponíveis.</p>
        )}
        {visibleBounds && (
          <p className="rounded-lg border border-line bg-white p-3 text-xs text-ink-secondary">
            Área atualmente visível (não aplicada automaticamente):{' '}
            {visibleBounds.minLat.toFixed(3)} a {visibleBounds.maxLat.toFixed(3)} latitude,
            {' '}{visibleBounds.minLng.toFixed(3)} a {visibleBounds.maxLng.toFixed(3)} longitude.
          </p>
        )}
        {viewportDiffers && (
          <p role="note" className="text-xs text-amber-800">
            O mapa foi movimentado desde a última busca por região.
            Os resultados ainda usam a área aplicada anteriormente.
          </p>
        )}
        <Button type="button" className="w-full" variant="outline"
          onClick={onSearchArea} disabled={!canSearchArea}>
          Buscar nesta área do mapa
        </Button>
        {appliedBounds && (
          <button type="button" onClick={onClearArea} className="text-sm font-semibold text-brand-primary underline">
            Remover filtro geográfico
          </button>
        )}
      </section>

      {onExtraChange && <ExtraOccurrenceFilters compact key={JSON.stringify(draft)} filters={draft} onApply={onExtraChange} />}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="space-y-2 border-t border-line pt-5">
        <Button type="button" className="w-full" onClick={onApply}
>Aplicar filtros</Button>
        <Button type="button" className="w-full" variant="outline" onClick={onClear}>
          <RotateCcw size={16} aria-hidden="true" /> Limpar seleção
        </Button>
      </div>
    </aside>
  );
}

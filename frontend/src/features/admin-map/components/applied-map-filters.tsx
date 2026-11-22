import { X } from 'lucide-react';
import type { MapCategory, MapFilters } from '../services/admin-occurrences.service';
import { useAppliedMapFilters } from '../view-models/use-applied-map-filters';

export function AppliedMapFilters({ filters, categories, onApply, onClear }: {
  filters: MapFilters; categories?: MapCategory[]; onApply: (filters: MapFilters) => void; onClear: () => void;
}) {
  const chips = useAppliedMapFilters(filters, categories);
  if (!chips.length) return null;
  return <section aria-label="Filtros aplicados" className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-white px-4 py-2 md:px-8">
    <span className="text-xs text-ink-secondary">Filtros aplicados:</span>
    <ul className="flex min-w-0 flex-wrap gap-2">
      {chips.map(chip => <li key={chip.key} className="min-w-0 max-w-full">
        <button type="button" onClick={() => onApply(chip.without)} aria-label={`Remover filtro ${chip.label}`} title={chip.label}
          className="flex min-h-8 max-w-full items-center gap-2 rounded-full border border-brand-primary/20 bg-surface-info px-3 py-1 text-xs text-brand-primary transition hover:bg-brand-primary/10">
          <span className="max-w-[260px] truncate sm:max-w-[360px]">{chip.label}</span><X size={13} className="shrink-0" aria-hidden="true" />
        </button>
      </li>)}
    </ul>
    <button type="button" onClick={onClear} className="min-h-8 px-1 text-xs font-semibold text-brand-primary underline underline-offset-2">Limpar todos</button>
  </section>;
}

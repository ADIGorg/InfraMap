import { useState, type FormEvent } from 'react';
import { Button } from '@/shared/components/button';
import { filtersSchema, statusOptions, type AdminOccurrenceFilters } from '../services/admin-occurrences.service';

interface Props {
  filters: AdminOccurrenceFilters;
  categories: Array<{ id: string; name: string }>;
  categoriesUnavailable: boolean;
  onChange: (value: Partial<AdminOccurrenceFilters>) => void;
  onClear: () => void;
}
export function OccurrenceFilters({ filters, categories, categoriesUnavailable, onChange, onClear }: Props) {
  const [error, setError] = useState('');
  function applyRegion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const bounds = Object.fromEntries(['minLat', 'maxLat', 'minLng', 'maxLng'].map(key => [key, data.get(key) || undefined]));
    const result = filtersSchema.safeParse({ ...filters, ...bounds, page: 1 });
    if (!result.success) { setError(result.error.issues.map(issue => issue.message).join(' ')); return; }
    setError('');
    onChange(result.data);
  }
  return (
    <section aria-label="Filtros de ocorrências" className="mb-6 space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-48 flex-1 text-sm font-semibold">
          Categoria
          <select className="field-input mt-2" value={filters.categoryId ?? ''} disabled={categoriesUnavailable}
            onChange={event => onChange({ categoryId: event.target.value || undefined, page: 1 })}>
            <option value="">Todas as categorias</option>
            {filters.categoryId && !categories.some(category => category.id === filters.categoryId) &&
              <option value={filters.categoryId}>Categoria selecionada</option>}
            {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <label className="min-w-48 flex-1 text-sm font-semibold">
          Ordenação
          <select className="field-input mt-2" value={filters.sort} onChange={event => onChange({ sort: event.target.value as AdminOccurrenceFilters['sort'], page: 1 })}>
            <option value="recent">Mais recentes</option><option value="oldest">Mais antigas</option><option value="most_liked">Mais curtidas</option>
          </select>
        </label>
        <label className="text-sm font-semibold">
          Por página
          <select className="field-input mt-2" value={filters.pageSize} onChange={event => onChange({ pageSize: Number(event.target.value), page: 1 })}>
            {Array.from(new Set([10, 20, 50, 100, filters.pageSize])).sort((a, b) => a - b).map(size => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <Button variant="outline" onClick={onClear}>Limpar filtros</Button>
      </div>
      <fieldset className="rounded-xl border border-line-subtle bg-white px-4 pb-3">
        <legend className="px-1 text-sm font-semibold">Status</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-3">
          {statusOptions.map(([value, label]) => <label key={value} className="flex min-h-8 items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-brand-primary" checked={filters.status?.includes(value) ?? false}
              onChange={event => {
                const status = event.target.checked ? [...(filters.status ?? []), value] : filters.status?.filter(item => item !== value);
                onChange({ status: status?.length ? status : undefined, page: 1 });
              }} />{label}
          </label>)}
        </div>
        <p className="mt-2 text-xs text-ink-secondary">Sem seleção, todos os status são consultados.</p>
      </fieldset>
      <details className="rounded-xl border border-line-subtle bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-brand-primary">Filtrar por região</summary>
        <form onSubmit={applyRegion} className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {([['minLat', 'Latitude mínima'], ['maxLat', 'Latitude máxima'], ['minLng', 'Longitude mínima'], ['maxLng', 'Longitude máxima']] as const).map(([key, label]) =>
              <label key={key} className="text-sm">{label}<input className="field-input mt-2" name={key} type="number" step="any"
                min={key.endsWith('Lat') ? -90 : -180} max={key.endsWith('Lat') ? 90 : 180} defaultValue={filters[key] ?? ''} /></label>)}
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
          <Button type="submit" className="mt-3">Aplicar região</Button>
        </form>
      </details>
    </section>
  );
}


import { ACTIVE_STATUSES, type MapCategory, type MapFilters } from './admin-occurrences.service';

const STATUS_LABELS = { RECEIVED: 'Recebido', UNDER_ANALYSIS: 'Em análise', CONFIRMED: 'Confirmado', IN_SERVICE: 'Em atendimento' };
const PRIORITY_LABELS = { HIGH: 'Alta', MEDIUM: 'Média', LOW: 'Baixa', UNDEFINED: 'Não definida' };
type Neighborhood = { id: string; name: string; municipality: string };
export type AppliedMapFilter = { key: string; label: string; without: MapFilters };

export function describeAppliedMapFilters(filters: MapFilters, categories: MapCategory[] = [], neighborhoods: Neighborhood[] = []): AppliedMapFilter[] {
  const chips: AppliedMapFilter[] = [];
  const add = (key: string, label: string, changes: Partial<MapFilters>) => chips.push({ key, label, without: { ...filters, ...changes } });
  if (filters.q) add('q', `Busca: ${filters.q}`, { q: undefined });
  if (filters.categoryId) add('category', `Categoria: ${categories.find(item => item.id === filters.categoryId)?.name ?? 'selecionada'}`, { categoryId: '' });
  if (filters.statuses.length !== ACTIVE_STATUSES.length) {
    add('status', `Status: ${filters.statuses.map(status => STATUS_LABELS[status]).join(', ')}`, { statuses: [...ACTIVE_STATUSES] });
  }
  if (filters.priority) add('priority', `Prioridade: ${PRIORITY_LABELS[filters.priority]}`, { priority: undefined });
  if (filters.neighborhoodId) {
    const neighborhood = neighborhoods.find(item => item.id === filters.neighborhoodId);
    add('neighborhood', `Bairro: ${neighborhood?.name ?? 'selecionado'}`, { neighborhoodId: undefined });
  }
  if (filters.createdFrom || filters.createdBefore) {
    const format = (value: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
    const range = [filters.createdFrom ? `de ${format(filters.createdFrom)}` : '', filters.createdBefore ? `antes de ${format(filters.createdBefore)}` : ''].filter(Boolean).join(' ');
    add('period', `Período: ${range}`, { createdFrom: undefined, createdBefore: undefined });
  }
  if (filters.bbox) add('area', 'Região: área selecionada no mapa', { bbox: null });
  return chips;
}

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppliedMapFilters } from './applied-map-filters';
import { DEFAULT_FILTERS, type MapFilters } from '../services/admin-occurrences.service';
vi.mock('@/infrastructure/api/http-client', () => ({ http: vi.fn() }));
afterEach(cleanup);
const neighborhoodId = 'b3975bde-484a-4210-87e1-7532c60b7a8c';
const filters: MapFilters = { statuses: ['CONFIRMED'], categoryId: 'cat', q: 'vazamento', priority: 'HIGH', neighborhoodId,
  createdFrom: '2026-11-01T00:00:00Z', createdBefore: '2026-11-20T00:00:00Z', bbox: { minLat: -13, maxLat: -12, minLng: -39, maxLng: -38 } };

function mount(value: MapFilters = filters) {
  const apply = vi.fn(), clear = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } });
  client.setQueryData(['admin', 'neighborhoods'], [{ id: neighborhoodId, name: 'Santo Antônio dos Prazeres', municipality: 'Feira de Santana' }]);
  const view = render(<QueryClientProvider client={client}><AppliedMapFilters filters={value}
    categories={[{ id: 'cat', code: 'CAT01', name: 'Esgoto' }]} onApply={apply} onClear={clear} /></QueryClientProvider>);
  return { apply, clear, close: () => { view.unmount(); client.clear(); } };
}

describe('Etiquetas dos filtros aplicados ao mapa e à lista', () => {
  it('mostra todos os critérios com nomes e remove apenas o bairro selecionado', () => {
    const { apply, close } = mount();
    expect(screen.getAllByRole('listitem')).toHaveLength(7);
    expect(screen.getByText('Categoria: Esgoto')).toBeInTheDocument();
    expect(screen.getByText('Status: Confirmado')).toBeInTheDocument();
    expect(screen.getByText('Prioridade: Alta')).toBeInTheDocument();
    expect(screen.getByText(/Período: de .* antes de/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remover filtro Bairro: Santo Antônio dos Prazeres' }));
    expect(apply).toHaveBeenCalledWith({ ...filters, neighborhoodId: undefined }); close();
  });
  it('remove as duas datas juntas, restaura todos os status ativos e remove a área sem afetar o bairro', () => {
    const { apply, close } = mount();
    fireEvent.click(screen.getByRole('button', { name: /Remover filtro Período:/ }));
    expect(apply).toHaveBeenLastCalledWith({ ...filters, createdFrom: undefined, createdBefore: undefined });
    fireEvent.click(screen.getByRole('button', { name: /Remover filtro Status:/ }));
    expect(apply).toHaveBeenLastCalledWith({ ...filters, statuses: DEFAULT_FILTERS.statuses });
    fireEvent.click(screen.getByRole('button', { name: /Remover filtro Região:/ }));
    expect(apply).toHaveBeenLastCalledWith({ ...filters, bbox: null }); close();
  });
  it('oferece limpar todos e não ocupa espaço quando os filtros são os padrões', () => {
    const view = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Limpar todos' })); expect(view.clear).toHaveBeenCalledOnce(); view.close();
    const defaults = mount(DEFAULT_FILTERS);
    expect(screen.queryByRole('region', { name: 'Filtros aplicados' })).not.toBeInTheDocument(); defaults.close();
  });
});

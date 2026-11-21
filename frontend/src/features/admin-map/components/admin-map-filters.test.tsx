import { selectOption } from '../../../../tests/select-option';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminMapFilters } from './admin-map-filters';
import { DEFAULT_FILTERS, type MapFilters } from '../services/admin-occurrences.service';
vi.mock('@/infrastructure/api/http-client', () => ({ http: vi.fn() }));
const simId = 'c98b15a0-71e3-47df-baa4-8241daacb596';
const santoId = 'b3975bde-484a-4210-87e1-7532c60b7a8c';
const bounds = { minLat: -13, maxLat: -12, minLng: -39, maxLng: -38 };
afterEach(() => { cleanup(); vi.useRealTimers(); });

function mount(initial: MapFilters = DEFAULT_FILTERS) {
  const apply = vi.fn();
  const clear = vi.fn();
  const client = new QueryClient();
  client.setQueryData(['admin', 'neighborhoods'], [
    { id: simId, name: 'Sim', municipality: 'Feira de Santana' },
    { id: santoId, name: 'Santo Antônio dos Prazeres', municipality: 'Feira de Santana' },
  ]);
  const view = render(<QueryClientProvider client={client}><AdminMapFilters initial={initial} visibleBounds={bounds}
    categories={[{ id: 'cat-1', name: 'Categoria teste', code: 'CAT01' }]} categoriesLoading={false} categoriesError={false}
    canSearchArea onApply={apply} onClear={clear} /></QueryClientProvider>);
  return { apply, clear, close: () => { view.unmount(); client.clear(); } };
}
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));

describe('Filtros do mapa em rascunho', () => {
  it('combina critérios em uma ação e bloqueia período invertido', () => {
    const { apply, close } = mount();
    expect(screen.queryByLabelText('Buscar por ID, categoria ou descrição')).not.toBeInTheDocument();
    selectOption(screen.getByLabelText('Categoria da ocorrência'), 'cat-1');
    selectOption(screen.getByLabelText('Prioridade'), 'HIGH');
    selectOption(screen.getByLabelText('Selecionar bairro'), simId);
    fireEvent.click(screen.getByText('Período'));
    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-11-20T10:00' } });
    fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2026-11-19T10:00' } });
    expect(apply).not.toHaveBeenCalled(); submit();
    expect(apply).not.toHaveBeenCalled(); expect(screen.getByRole('alert')).toHaveTextContent('início do período');
    fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2026-11-21T10:00' } }); submit();
    expect(apply).toHaveBeenCalledWith(expect.objectContaining({ priority: 'HIGH', categoryId: 'cat-1', neighborhoodId: simId,
      createdFrom: new Date('2026-11-20T10:00').toISOString(), createdBefore: new Date('2026-11-21T10:00').toISOString() }));
    close();
  });
  it('pesquisa bairros sem acento e mantém a seleção quando não há correspondência', () => {
    const { apply, close } = mount({ ...DEFAULT_FILTERS, neighborhoodId: simId });
    fireEvent.change(screen.getByLabelText('Pesquisar bairro'), { target: { value: 'santo antonio' } });
    expect(screen.getByRole('option', { name: 'Santo Antônio dos Prazeres' })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByLabelText('Pesquisar bairro'), { key: 'Escape' });
    expect(screen.getByLabelText('Selecionar bairro')).toHaveTextContent('Sim');
    fireEvent.change(screen.getByLabelText('Pesquisar bairro'), { target: { value: 'inexistente' } });
    expect(screen.getByRole('status')).toHaveTextContent('Nenhum bairro encontrado');
    expect(screen.getByRole('button', { name: 'Aplicar filtros' })).toBeDisabled();
    selectOption(screen.getByLabelText('Prioridade'), 'HIGH');
    submit(); expect(apply).toHaveBeenCalledWith(expect.objectContaining({ neighborhoodId: simId })); close();
  });
  it('aciona a limpeza imediata sem exigir aplicar nem validar o rascunho', () => {
    const { apply, clear, close } = mount({ ...DEFAULT_FILTERS, neighborhoodId: simId, bbox: bounds, priority: 'HIGH', createdFrom: '2026-11-01T00:00:00Z' });
    for (const name of ['Recebido', 'Em análise', 'Confirmado', 'Em atendimento']) fireEvent.click(screen.getByRole('checkbox', { name }));
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(clear).toHaveBeenCalledOnce(); expect(apply).not.toHaveBeenCalled(); close();
  });
  it('restaura os campos e permite escolher novos filtros sem fechar o painel', () => {
    const apply = vi.fn();
    const client = new QueryClient();
    client.setQueryData(['admin', 'neighborhoods'], []);
    function Harness() {
      const [initial, setInitial] = useState<MapFilters>({ ...DEFAULT_FILTERS, priority: 'HIGH', createdFrom: '2026-11-01T00:00:00Z' });
      return <AdminMapFilters initial={initial} visibleBounds={null} categories={[]} categoriesLoading={false} categoriesError={false}
        canSearchArea={false} onApply={apply} onClear={() => setInitial(DEFAULT_FILTERS)} />;
    }
    const view = render(<QueryClientProvider client={client}><Harness /></QueryClientProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(screen.getByRole('form', { name: 'Filtros avançados' })).toBeInTheDocument();
    expect(screen.getByLabelText('Prioridade')).toHaveTextContent('Todas');
    expect(screen.getByLabelText('De')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Aplicar filtros' })).toBeDisabled();
    selectOption(screen.getByLabelText('Prioridade'), 'LOW'); submit();
    expect(apply).toHaveBeenCalledWith(expect.objectContaining({ priority: 'LOW', bbox: null }));
    view.unmount(); client.clear();
  });
  it('seleciona uma sugestão por clique e só aplica após confirmar', () => {
    const { apply, close } = mount();
    fireEvent.change(screen.getByLabelText('Pesquisar bairro'), { target: { value: 'santo antonio' } });
    fireEvent.click(screen.getByRole('option', { name: 'Santo Antônio dos Prazeres' }));
    expect(screen.queryByRole('listbox', { name: 'Sugestões de bairros' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Selecionar bairro')).toHaveTextContent('Santo Antônio dos Prazeres');
    expect(apply).not.toHaveBeenCalled(); submit();
    expect(apply).toHaveBeenCalledWith(expect.objectContaining({ neighborhoodId: santoId })); close();
  });
  it('seleciona sugestão com Enter e mantém a seleção ao apagar a pesquisa', () => {
    const { apply, close } = mount();
    const search = screen.getByLabelText('Pesquisar bairro');
    fireEvent.change(search, { target: { value: 'sim' } });
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(apply).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Selecionar bairro')).toHaveTextContent('Sim');
    fireEvent.change(search, { target: { value: 'outro' } });
    fireEvent.change(search, { target: { value: '' } });
    submit(); expect(apply).toHaveBeenCalledWith(expect.objectContaining({ neighborhoodId: simId })); close();
  });
  it('combina bairro e área apenas ao aplicar e valida status vazio', () => {
    const { apply, close } = mount({ ...DEFAULT_FILTERS, neighborhoodId: santoId });
    fireEvent.click(screen.getByText('Região geográfica'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Restringir à área visível do mapa' }));
    expect(apply).not.toHaveBeenCalled(); submit();
    expect(apply).toHaveBeenCalledWith(expect.objectContaining({ bbox: bounds, neighborhoodId: santoId }));
    for (const name of ['Recebido', 'Em análise', 'Confirmado', 'Em atendimento']) fireEvent.click(screen.getByRole('checkbox', { name }));
    submit(); expect(apply).toHaveBeenCalledOnce(); expect(screen.getByRole('alert')).toHaveTextContent('pelo menos um status'); close();
  });
  it('preenche atalhos de período e permite remover datas de um filtro anterior', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-20T15:00:00Z'));
    const { apply, close } = mount({ ...DEFAULT_FILTERS, createdFrom: '2026-10-01T00:00:00Z', createdBefore: '2026-11-01T00:00:00Z' });
    fireEvent.click(screen.getByText('Período · definido'));
    selectOption(screen.getByLabelText('Intervalo'), '7'); submit();
    expect(apply).toHaveBeenLastCalledWith(expect.objectContaining({ createdFrom: '2026-11-13T15:00:00.000Z', createdBefore: '2026-11-20T15:00:00.000Z' }));
    selectOption(screen.getByLabelText('Intervalo'), 'all'); submit();
    expect(apply.mock.calls[1][0].createdFrom).toBeUndefined(); expect(apply.mock.calls[1][0].createdBefore).toBeUndefined(); close();
  });
  it('só habilita ao alterar critérios e desabilita ao desfazer a alteração', () => {
    const { apply, close } = mount();
    const button = screen.getByRole('button', { name: 'Aplicar filtros' });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Recebido' })); expect(button).toBeEnabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Recebido' })); expect(button).toBeDisabled();
    selectOption(screen.getByLabelText('Prioridade'), 'HIGH'); expect(button).toBeEnabled();
    selectOption(screen.getByLabelText('Prioridade'), ''); expect(button).toBeDisabled();
    fireEvent.submit(screen.getByRole('form', { name: 'Filtros avançados' })); expect(apply).not.toHaveBeenCalled(); close();
  });
  it('preserva segundos das datas já aplicadas ao alterar outro critério', () => {
    const createdFrom = '2026-11-01T12:30:45.123Z';
    const { apply, close } = mount({ ...DEFAULT_FILTERS, createdFrom });
    expect(screen.getByRole('button', { name: 'Aplicar filtros' })).toBeDisabled();
    selectOption(screen.getByLabelText('Prioridade'), 'LOW'); submit();
    expect(apply).toHaveBeenCalledWith(expect.objectContaining({ priority: 'LOW', createdFrom })); close();
  });
  it('atualiza a área anterior ao desmarcar e marcar, sem botão duplicado', () => {
    const { apply, close } = mount({ ...DEFAULT_FILTERS, bbox: { ...bounds, minLat: -14 } });
    fireEvent.click(screen.getByText('Região geográfica · restrita'));
    expect(screen.queryByRole('button', { name: 'Usar área visível atual' })).not.toBeInTheDocument();
    const checkbox = screen.getByRole('checkbox', { name: 'Restringir à área visível do mapa' });
    expect(screen.getByRole('button', { name: 'Aplicar filtros' })).toBeDisabled();
    fireEvent.click(checkbox); fireEvent.click(checkbox);
    expect(apply).not.toHaveBeenCalled(); submit();
    expect(apply).toHaveBeenCalledWith(expect.objectContaining({ bbox: bounds })); close();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminMapPage } from './admin-map-page';
import { useAdminMapViewModel } from '../view-models/use-admin-map-view-model';

vi.mock('../view-models/use-admin-map-view-model', () => ({
  useAdminMapViewModel: vi.fn(),
  describeMapMutationError: () => 'Não foi possível salvar.',
}));
vi.mock('@/config/env', () => ({
  env: { googleMapsKey: '', googleMapId: 'DEMO_MAP_ID' },
}));
vi.mock('@/infrastructure/api/http-client', () => ({ http: vi.fn() }));
vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Map: ({ children }: { children: React.ReactNode }) => <div data-testid="google-map">{children}</div>,
  AdvancedMarker: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pin: () => <span>Pin</span>,
  InfoWindow: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const item = {
  id: '916e5e03-87bc-4eae-8474-a48956d9eaaa',
  status: 'RECEIVED' as const,
  category: { id: '352e55c2-9943-4215-a185-4f100966138e', code: 'CAT01', name: 'Vazamento' },
  description: 'Vazamento na rua',
  location: { lat: -12.99, lng: -38.5 },
  priority: null,
  createdAt: '2026-11-17T12:00:00Z',
};
const onAdjust = vi.fn(), onApply = vi.fn(), onSearch = vi.fn(), onUpdate = vi.fn();

function configure(overrides: Record<string, unknown> = {}) {
  const vm = {
    categories: { data: [{ id: item.category.id, code: 'CAT01', name: 'Vazamento' }], isPending: false, isError: false },
    occurrences: { data: [item], isPending: false, isError: false, isFetching: false, refetch: onUpdate },
    draft: { statuses: ['RECEIVED', 'UNDER_ANALYSIS', 'CONFIRMED', 'IN_SERVICE'], categoryId: '' },
    applied: { statuses: ['RECEIVED', 'UNDER_ANALYSIS', 'CONFIRMED', 'IN_SERVICE'], categoryId: '', bbox: null },
    selected: null, availableBounds: null, adjusting: null, candidate: null, confirming: false, inputError: null,
    mutation: { error: null, isPending: false },
    updateStatus: vi.fn(), setCategory: vi.fn(),
    applyFilters: onApply, clearFilters: vi.fn(), searchVisibleArea: onSearch, clearArea: vi.fn(),
    selectOccurrence: vi.fn(), setAvailableBounds: vi.fn(),
    startAdjustment: onAdjust, cancelAdjustment: vi.fn(), requestConfirmation: vi.fn(),
    setCandidate: vi.fn(), setConfirming: vi.fn(), saveAdjustment: vi.fn(),
    ...overrides,
  };
  vi.mocked(useAdminMapViewModel).mockReturnValue(vm as unknown as ReturnType<typeof useAdminMapViewModel>);
}

function show() { return render(<MemoryRouter><AdminMapPage /></MemoryRouter>); }

describe('AdminMapPage', () => {
  beforeEach(() => configure());

  it('mostra a lista textual quando a chave Google está ausente, sem dados simulados', () => {
    show();
    expect(screen.getByRole('heading', { name: 'Mapa Administrativo' })).toBeInTheDocument();
    expect(screen.getByText('A chave pública do Google Maps ainda não foi configurada.')).toBeInTheDocument();
    expect(screen.getByText('Vazamento na rua')).toBeInTheDocument();
    expect(screen.getByText(/-12.990000, -38.500000/)).toBeInTheDocument();
    expect(screen.queryByTestId('google-map')).not.toBeInTheDocument();
  });

  it('oferece filtro de status ativo sem fingir filtro de bairro ou período', () => {
    show();
    expect(screen.getByRole('checkbox', { name: 'Recebido' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Em atendimento' })).toBeChecked();
    expect(screen.queryByRole('checkbox', { name: 'Resolvido' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Bairro')).toBeDisabled();
    expect(screen.getByLabelText('Período de abertura')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
    expect(onApply).toHaveBeenCalledOnce();
  });

  it('permite iniciar ajuste a partir da lista de contingência', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Ajustar posição' }));
    expect(onAdjust).toHaveBeenCalledWith(item);
  });

  it('não mascara falha do endpoint de ocorrências com lista vazia', () => {
    configure({ occurrences: { data: undefined, isPending: false, isError: true, isFetching: false, refetch: onUpdate } });
    show();
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível consultar as ocorrências');
    expect(screen.queryByText('Nenhuma ocorrência ativa corresponde aos filtros.')).not.toBeInTheDocument();
  });

  it('não confunde banco vazio com erro', () => {
    configure({ occurrences: { data: [], isPending: false, isError: false, isFetching: false, refetch: onUpdate } });
    show();
    expect(screen.getByText('Nenhuma ocorrência ativa corresponde aos filtros.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

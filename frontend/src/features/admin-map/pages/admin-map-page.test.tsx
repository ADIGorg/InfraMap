import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { forwardRef, useImperativeHandle } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AdminMapPage } from './admin-map-page';
import { useAdminMapViewModel } from '../view-models/use-admin-map-view-model';

vi.mock('../view-models/use-admin-map-view-model', () => ({
  useAdminMapViewModel: vi.fn(),
  describeMapMutationError: () => 'Não foi possível salvar.',
}));
vi.mock('@/infrastructure/api/http-client', () => ({ http: vi.fn() }));
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="leaflet-map">{children}</div>
  ),
  TileLayer: ({ url, attribution, eventHandlers }: {
    url: string;
    attribution: string;
    eventHandlers?: { tileerror?: () => void };
  }) => (
    <div data-testid="tile-layer" data-url={url} data-attribution={attribution}>
      <button type="button" onClick={() => eventHandlers?.tileerror?.()}>Simular falha de tiles</button>
    </div>
  ),
  Marker: forwardRef(function MarkerMock({
    eventHandlers, position, title, draggable,
  }: {
    eventHandlers?: { click?: () => void; dragend?: () => void };
    position: [number, number]; title?: string; draggable?: boolean;
  }, ref: React.ForwardedRef<{ getLatLng: () => { lat: number; lng: number } }>) {
    useImperativeHandle(ref, () => ({
      getLatLng: () => ({ lat: position[0] + 0.01, lng: position[1] + 0.01 }),
    }));
    return (
      <button type="button" title={title}
        data-testid={draggable ? 'draggable-marker' : 'map-marker'}
        onClick={() => eventHandlers?.click?.()}
        onDoubleClick={() => eventHandlers?.dragend?.()}>
        Marcador
      </button>
    );
  }),
  Popup: ({ children }: { children: React.ReactNode }) => <div data-testid="map-popup">{children}</div>,
  useMap: () => ({ panTo: vi.fn() }),
  useMapEvents: (() => {
    const bounds = {
      getSouth: () => -13,
      getNorth: () => -12,
      getWest: () => -39,
      getEast: () => -38,
    };
    const map = { getBounds: () => bounds };
    return () => map;
  })(),
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

const onAdjust = vi.fn(), onApply = vi.fn(), onUpdate = vi.fn();
const onSelect = vi.fn(), onSetPosition = vi.fn(), onRequestConfirmation = vi.fn();
const onSetBounds = vi.fn();

function configure(overrides: Record<string, unknown> = {}) {
  const vm = {
    categories: {
      data: [{ id: item.category.id, code: 'CAT01', name: 'Vazamento' }],
      isPending: false, isError: false,
    },
    occurrences: { data: [item], isPending: false, isError: false, isFetching: false, refetch: onUpdate },
    draft: { statuses: ['RECEIVED', 'UNDER_ANALYSIS', 'CONFIRMED', 'IN_SERVICE'], categoryId: '' },
    applied: { statuses: ['RECEIVED', 'UNDER_ANALYSIS', 'CONFIRMED', 'IN_SERVICE'], categoryId: '', bbox: null },
    selected: null, availableBounds: null,
    adjusting: null, candidate: null, confirming: false, inputError: null,
    mutation: { error: null, isPending: false },
    updateStatus: vi.fn(), setCategory: vi.fn(),
    applyFilters: onApply, clearFilters: vi.fn(), searchVisibleArea: vi.fn(), clearArea: vi.fn(),
    selectOccurrence: onSelect, setAvailableBounds: onSetBounds,
    startAdjustment: onAdjust, cancelAdjustment: vi.fn(), requestConfirmation: onRequestConfirmation,
    setCandidate: onSetPosition, setConfirming: vi.fn(), saveAdjustment: vi.fn(),
    ...overrides,
  };
  vi.mocked(useAdminMapViewModel).mockReturnValue(vm as unknown as ReturnType<typeof useAdminMapViewModel>);
}

function show() { return render(<MemoryRouter><AdminMapPage /></MemoryRouter>); }

describe('AdminMapPage / OpenStreetMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configure();
  });

  it('exibe OpenStreetMap sem chave API e com atribuição obrigatória', () => {
    show();
    expect(screen.getByRole('heading', { name: 'Mapa Administrativo' })).toBeInTheDocument();
    expect(screen.getByTestId('leaflet-map')).toBeInTheDocument();
    expect(screen.getByTestId('tile-layer')).toHaveAttribute(
      'data-url', 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    );
    expect(screen.getByTestId('tile-layer')).toHaveAttribute(
      'data-attribution', expect.stringContaining('openstreetmap.org/copyright'),
    );
    expect(screen.getByTitle(/Ocorrência #916e5e03/)).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('Selecione um marcador');
    expect(onSetBounds).toHaveBeenCalledWith({
      minLat: -13, maxLat: -12, minLng: -39, maxLng: -38,
    });
  });

  it('mantém filtro de status ativo, sem bairro/período fictícios', () => {
    show();
    expect(screen.getByRole('checkbox', { name: 'Recebido' })).toBeChecked();
    expect(screen.queryByRole('checkbox', { name: 'Resolvido' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Bairro')).toBeDisabled();
    expect(screen.getByLabelText('Período de abertura')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
    expect(onApply).toHaveBeenCalledOnce();
  });

  it('permite alternar mapa/lista e iniciar ajuste com os dados verdadeiros', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Visualizar em lista' }));
    expect(screen.queryByTestId('leaflet-map')).not.toBeInTheDocument();
    expect(screen.getByText('Vazamento na rua')).toBeInTheDocument();
    expect(screen.getByText(/-12.990000, -38.500000/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ajustar posição' }));
    expect(onAdjust).toHaveBeenCalledWith(item);
    fireEvent.click(screen.getByRole('button', { name: 'Ver mapa' }));
    expect(screen.getByTestId('leaflet-map')).toBeInTheDocument();
  });

  it('abre popup do marcador e apresenta ação de ajuste', () => {
    configure({ selected: item });
    show();
    expect(screen.getByTestId('map-popup')).toHaveTextContent('Vazamento na rua');
    fireEvent.click(screen.getByRole('button', { name: 'Ajustar posição' }));
    expect(onAdjust).toHaveBeenCalledWith(item);
  });

  it('mantém lista textual acessível se o tile do OSM falhar', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Simular falha de tiles' }));
    expect(screen.queryByTestId('leaflet-map')).not.toBeInTheDocument();
    expect(screen.getByText(/O serviço de mapas OpenStreetMap não está disponível/)).toBeInTheDocument();
    expect(screen.getByText('Vazamento na rua')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar carregar o mapa novamente' }));
    expect(screen.getByTestId('leaflet-map')).toBeInTheDocument();
  });

  it('não mascara falha da API como lista vazia', () => {
    configure({
      occurrences: { data: undefined, isPending: false, isError: true, isFetching: false, refetch: onUpdate },
    });
    show();
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível consultar as ocorrências');
    expect(screen.queryByText('Nenhuma ocorrência ativa corresponde aos filtros.')).not.toBeInTheDocument();
  });

  it('mostra mapa sem pins quando não há ocorrências', () => {
    configure({
      occurrences: { data: [], isPending: false, isError: false, isFetching: false, refetch: onUpdate },
    });
    show();
    expect(screen.getByText('Nenhuma ocorrência ativa corresponde aos filtros.')).toBeInTheDocument();
    expect(screen.queryByTestId('map-marker')).not.toBeInTheDocument();
    expect(screen.getByTestId('leaflet-map')).toBeInTheDocument();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('permite aplicar um filtro de status vazio para mostrar o erro de validação', () => {
    configure({ draft: { statuses: [], categoryId: '' } });
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
    expect(onApply).toHaveBeenCalledOnce();
  });

  it('usa marcador arrastável no modal de ajuste e requer confirmação', () => {
    configure({
      adjusting: item,
      candidate: { lat: -12.98, lng: -38.51 },
      confirming: false,
    });
    show();
    expect(screen.getByTestId('draggable-marker')).toBeInTheDocument();
    fireEvent.doubleClick(screen.getByTestId('draggable-marker'));
    expect(onSetPosition).toHaveBeenCalledWith({ lat: -12.97, lng: -38.5 });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar posição' }));
    expect(onRequestConfirmation).toHaveBeenCalledOnce();
  });
});

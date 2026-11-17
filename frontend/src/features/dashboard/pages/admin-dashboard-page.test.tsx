import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAdminDashboardViewModel } from '../view-models/use-admin-dashboard-view-model';
import { AdminDashboardPage } from './admin-dashboard-page';
import type { AdminDashboard } from '../services/dashboard.service';

vi.mock('../view-models/use-admin-dashboard-view-model', () => ({ useAdminDashboardViewModel: vi.fn() }));

const baseDashboard = {
  counts_by_status: {
    RECEIVED: 0, UNDER_ANALYSIS: 0, CONFIRMED: 0,
    IN_SERVICE: 0, RESOLVED: 0, REJECTED: 0,
  },
  high_priority_total: 0,
  average_resolution_days: null,
  sla_breaches: { received_over_48h: 0, under_analysis_over_5d: 0 },
};
const baseRecent = {
  id: '70acbaf0-fc1f-4079-9331-5b4c30be4123',
  category: { name: 'Vazamento de esgoto' },
  description: 'Esgoto vazando na rua',
  status: 'RECEIVED' as const,
  priority: 'HIGH' as const,
  createdAt: '2026-11-17T15:20:00Z',
};
const refresh = vi.fn();

function configure({
  data = baseDashboard,
  isError = false,
  isPending = false,
  items = [],
  recentError = false,
}: {
  data?: AdminDashboard;
  isError?: boolean;
  isPending?: boolean;
  items?: typeof baseRecent[];
  recentError?: boolean;
} = {}) {
  vi.mocked(useAdminDashboardViewModel).mockReturnValue({
    dashboard: { data, isError, isPending, isFetching: false },
    recent: { data: items, isError: recentError, isPending: false, isFetching: false },
    refresh,
    pollingSeconds: 30,
    highPriorityRecent: items.filter(i => i.priority === 'HIGH'),
  } as unknown as ReturnType<typeof useAdminDashboardViewModel>);
}

function display() {
  return render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>);
}

describe('AdminDashboardPage', () => {
  beforeEach(() => configure());

  it('renderiza todos os seis status inclusive zero legítimo, sem confundir com falta de dados', () => {
    display();
    const section = screen.getByRole('region', { name: 'Ocorrências por status' });
    expect(within(section).getAllByText('0')).toHaveLength(6);
    expect(screen.getByText('Sem resoluções')).toBeInTheDocument();
    expect(screen.getByText('Ocorrências recentes de prioridade alta')).toBeInTheDocument();
    expect(screen.getByText(/Dados diários indisponíveis/)).toBeInTheDocument();
  });

  it('apresenta high total, média, SLAs e cinco registros recentes sem série diária falsa', () => {
    const data = {
      ...baseDashboard,
      counts_by_status: { ...baseDashboard.counts_by_status, RECEIVED: 42, RESOLVED: 8 },
      high_priority_total: 6,
      average_resolution_days: 2.5,
      sla_breaches: { received_over_48h: 3, under_analysis_over_5d: 1 },
    };
    configure({ data, items: [baseRecent] });
    display();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('2,5 dias')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByText('Vazamento de esgoto')).toHaveLength(2);
    expect(screen.getByText('Dados diários indisponíveis nesta versão da API. A série real depende da API1-103.')).toBeInTheDocument();
  });

  it('falha de API não substitui indicadores por zeros', () => {
    configure({ isError: true, data: undefined, recentError: true });
    display();
    expect(screen.getAllByRole('alert')[0]).toHaveTextContent('Não foi possível carregar o dashboard');
    expect(screen.queryByRole('region', { name: 'Ocorrências por status' })).not.toBeInTheDocument();
    expect(screen.getByText('Não foi possível carregar a lista de ocorrências recentes.')).toBeInTheDocument();
  });

  it('mostra estado de carregamento antes de obter totais reais', () => {
    configure({ isPending: true, data: undefined });
    display();
    expect(screen.queryByRole('region', { name: 'Ocorrências por status' })).not.toBeInTheDocument();
    expect(screen.getByText('Atualização automática a cada 30 s')).toBeInTheDocument();
  });

  it('botão atualizar solicita refetch explícito', () => {
    display();
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

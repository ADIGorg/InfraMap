import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAdminDashboardViewModel } from '../view-models/use-admin-dashboard-view-model';
import { AdminDashboardPage } from './admin-dashboard-page';
import type { AdminDashboard } from '../services/dashboard.service';

vi.mock('../view-models/use-admin-dashboard-view-model', () => ({ useAdminDashboardViewModel: vi.fn() }));
vi.mock('@/infrastructure/api/http-client', () => ({ http: vi.fn() }));

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
  priorities = items.filter(item => item.priority === 'HIGH'),
  priorityError = false,
  priorityTotalPages = 1,
}: {
  data?: AdminDashboard;
  isError?: boolean;
  isPending?: boolean;
  items?: typeof baseRecent[];
  recentError?: boolean;
  priorities?: typeof baseRecent[];
  priorityError?: boolean;
  priorityTotalPages?: number;
} = {}) {
  vi.mocked(useAdminDashboardViewModel).mockReturnValue({
    dashboard: { data, isError, isPending, isFetching: false },
    recent: { data: items, isError: recentError, isPending: false, isFetching: false },
    refresh,
    pollingSeconds: 30,
    highPriority: { data: { data: priorities, pagination: { total: priorities.length, totalPages: priorityTotalPages } }, isPending: false, isError: priorityError, isSuccess: !priorityError, isFetching: false, refetch: vi.fn() },
    priorityPage: 1, setPriorityPage: vi.fn(), priorityTotalPages,
  } as unknown as ReturnType<typeof useAdminDashboardViewModel>);
}

function display() {
  return render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>);
}

describe('AdminDashboardPage', () => {
  beforeEach(() => configure());

  it('cada card abre a lista com seu status, inclusive quando o total é zero', () => {
    display();
    for (const [label, status] of [
      ['Recebido', 'RECEIVED'], ['Em análise', 'UNDER_ANALYSIS'], ['Confirmado', 'CONFIRMED'],
      ['Em atendimento', 'IN_SERVICE'], ['Resolvido', 'RESOLVED'], ['Rejeitado', 'REJECTED'],
    ]) {
      expect(screen.getByRole('link', { name: 'Ver ocorrências com status ' + label }))
        .toHaveAttribute('href', '/admin/occurrences?status=' + status);
    }
  });

  it('renderiza todos os seis status inclusive zero legítimo, sem confundir com falta de dados', () => {
    display();
    const section = screen.getByRole('region', { name: 'Ocorrências por status' });
    expect(within(section).getAllByText('0')).toHaveLength(6);
    expect(screen.getByText('Sem resoluções')).toBeInTheDocument();
    expect(screen.getByText('Ocorrências de prioridade alta')).toBeInTheDocument();
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
    expect(screen.getByText('Dados diários indisponíveis nesta versão da API.')).toBeInTheDocument();
  });

  it('falha de API não substitui indicadores por zeros', () => {
    configure({ isError: true, data: undefined, recentError: true });
    display();
    expect(screen.getAllByRole('alert')[0]).toHaveTextContent('Não foi possível carregar o dashboard');
    expect(screen.queryByRole('region', { name: 'Ocorrências por status' })).not.toBeInTheDocument();
    expect(screen.getByText(/Não foi possível consultar as ocorrências recentes/)).toBeInTheDocument();
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

  it('mostra prioridade alta antiga mesmo com lista recente vazia e permite paginar', () => {
    configure({ items: [], priorities: [{ ...baseRecent, createdAt: '2025-01-01T00:00:00Z' }], priorityTotalPages: 2 });
    display();
    fireEvent.click(screen.getByRole('tab', { name: 'Prioridades (1)' }));
    expect(screen.getByRole('link', { name: 'Vazamento de esgoto' })).toHaveAttribute('href', '/admin/occurrences/' + baseRecent.id);
    expect(screen.getByRole('link', { name: 'Ver todas as prioridades altas' })).toHaveAttribute('href', '/admin/occurrences?priority=HIGH');
    fireEvent.click(screen.getByRole('button', { name: 'Próximas prioridades' }));
    expect(vi.mocked(useAdminDashboardViewModel).mock.results.at(-1)?.value.setPriorityPage).toHaveBeenCalledWith(2);
  });

  it('trata falha da consulta de prioridades sem confundir com lista vazia', () => {
    configure({ priorityError: true });
    display();
    fireEvent.click(screen.getByRole('tab', { name: 'Prioridades (0)' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar as ocorrências de prioridade alta');
    expect(screen.queryByText('Nenhuma ocorrência de prioridade alta.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar carregar prioridades novamente' })).toBeEnabled();
  });

  it('alterna gráfico e prioridades sem perder o acesso às ocorrências', () => {
    configure({ items: [baseRecent] });
    display();
    expect(screen.getByRole('tab', { name: 'Gráfico' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Ocorrências de prioridade alta')).not.toBeVisible();
    fireEvent.click(screen.getByRole('tab', { name: 'Prioridades (1)' }));
    expect(screen.getByText('Ocorrências de prioridade alta')).toBeVisible();
    expect(screen.getByText(/Dados diários indisponíveis/)).not.toBeVisible();
    expect(screen.getByRole('table')).toBeVisible();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Prioridades (1)' }), { key: 'ArrowLeft' });
    expect(screen.getByRole('tab', { name: 'Gráfico' })).toHaveFocus();
    expect(screen.getByText(/Dados diários indisponíveis/)).toBeVisible();
  });

  it('permite recolher e restaurar os dois grupos de indicadores', () => {
    display();
    fireEvent.click(screen.getByText('Exibir'));
    fireEvent.click(screen.getByLabelText('Totais por status'));
    expect(screen.queryByRole('region', { name: 'Ocorrências por status' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Indicadores e prazos'));
    expect(screen.queryByRole('region', { name: 'Indicadores gerenciais e prazos' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Totais por status'));
    expect(screen.getByRole('region', { name: 'Ocorrências por status' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Gráfico' })).toBeVisible();
  });

  it('liga o gráfico à série do dashboard, independente dos cinco registros recentes', () => {
    configure({ data: { ...baseDashboard, daily_counts_timezone: 'America/Sao_Paulo',
      daily_counts: Array.from({ length: 7 }, (_, index) => ({ date: `2026-11-${12 + index}`, count: index === 3 ? 70 : 0 })),
    }, items: [baseRecent] });
    display();
    expect(screen.getByText(/70 ocorrências no período · Média diária de 10/)).toBeInTheDocument();
    expect(screen.queryByText(/Dados diários indisponíveis/)).not.toBeInTheDocument();
  });
});

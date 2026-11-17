import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http } from '@/infrastructure/api/http-client';
import { dashboardResponseSchema, getAdminDashboard, getRecentAdminOccurrences, recentOccurrencesResponseSchema } from './dashboard.service';

vi.mock('@/infrastructure/api/http-client', () => ({ http: vi.fn() }));

const emptyDashboard = {
  data: {
    counts_by_status: { RECEIVED: 0, UNDER_ANALYSIS: 0, CONFIRMED: 0, IN_SERVICE: 0, RESOLVED: 0, REJECTED: 0 },
    high_priority_total: 0,
    average_resolution_days: null,
    sla_breaches: { received_over_48h: 0, under_analysis_over_5d: 0 },
  },
};
const recentItem = {
  id: '10fa4ce2-1111-4111-8111-111111111111',
  category: { name: 'Vazamento de esgoto' },
  description: 'Problema de saneamento',
  status: 'UNDER_ANALYSIS',
  priority: 'HIGH',
  createdAt: '2026-11-17T12:00:00Z',
};

describe('DashboardService: contrato real', () => {
  beforeEach(() => vi.mocked(http).mockReset());

  it('mantém os seis zeros reais e média nula sem inventar dados', async () => {
    vi.mocked(http).mockResolvedValueOnce(emptyDashboard);
    expect(await getAdminDashboard()).toEqual(emptyDashboard.data);
    expect(http).toHaveBeenCalledWith('/admin/dashboard');
  });

  it('preserva métricas SLA e média reais sem cálculo no cliente', async () => {
    const response = {
      data: {
        ...emptyDashboard.data,
        counts_by_status: { ...emptyDashboard.data.counts_by_status, RECEIVED: 7 },
        high_priority_total: 3,
        average_resolution_days: 2.75,
        sla_breaches: { received_over_48h: 2, under_analysis_over_5d: 1 },
      },
    };
    vi.mocked(http).mockResolvedValueOnce(response);
    expect(await getAdminDashboard()).toEqual(response.data);
  });

  it('falha quando a API não informa um status, em vez de assumir zero', () => {
    const wrong = structuredClone(emptyDashboard);
    delete (wrong.data.counts_by_status as Partial<typeof emptyDashboard.data.counts_by_status>).REJECTED;
    expect(dashboardResponseSchema.safeParse(wrong).success).toBe(false);
  });

  it('não aceita contagem negativa, prioridade crítica inventada ou SLA ausente', () => {
    expect(dashboardResponseSchema.safeParse({
      data: { ...emptyDashboard.data, high_priority_total: -1 },
    }).success).toBe(false);
    expect(dashboardResponseSchema.safeParse({
      data: { ...emptyDashboard.data, sla_breaches: undefined },
    }).success).toBe(false);
    expect(recentOccurrencesResponseSchema.safeParse({
      data: [{ ...recentItem, priority: 'CRITICAL' }],
      pagination: { page: 1, pageSize: 5, total: 1, totalPages: 1 },
    }).success).toBe(false);
  });

  it('busca apenas os cinco itens mais recentes no endpoint real', async () => {
    vi.mocked(http).mockResolvedValueOnce({
      data: [recentItem],
      pagination: { page: 1, pageSize: 5, total: 1, totalPages: 1 },
    });
    const rows = await getRecentAdminOccurrences();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.priority).toBe('HIGH');
    expect(http).toHaveBeenCalledWith('/admin/occurrences?page=1&pageSize=5&sort=recent');
  });

  it('não converte falha de rede em dashboard zerado', async () => {
    vi.mocked(http).mockRejectedValueOnce(new Error('network offline'));
    await expect(getAdminDashboard()).rejects.toThrow('network offline');
  });
});

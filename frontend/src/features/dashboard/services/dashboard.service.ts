import { z } from 'zod';
import { http } from '@/infrastructure/api/http-client';
import { type OccurrenceStatus } from '@/shared/types/api';

const count = z.number().int().nonnegative();

export const dailyCountsSchema = z.array(z.object({ date: z.iso.date(), count })).length(7)
  .refine(days => days.every((day, index) => index === 0 ||
    Date.parse(day.date + 'T00:00:00Z') - Date.parse(days[index - 1].date + 'T00:00:00Z') === 86_400_000),
  'A série deve conter sete datas consecutivas em ordem crescente.');
export type DailyCount = z.infer<typeof dailyCountsSchema>[number];

export const dashboardResponseSchema = z.object({
  data: z.object({
    // Ausência permite rollout anterior à migration, sem inventar uma série zerada.
    daily_counts: dailyCountsSchema.optional(),
    daily_counts_timezone: z.literal('America/Sao_Paulo').optional(),
    counts_by_status: z.object({
      RECEIVED: count,
      UNDER_ANALYSIS: count,
      CONFIRMED: count,
      IN_SERVICE: count,
      RESOLVED: count,
      REJECTED: count,
    }),
    high_priority_total: count,
    average_resolution_days: z.number().finite().nonnegative().nullable(),
    sla_breaches: z.object({
      received_over_48h: count,
      under_analysis_over_5d: count,
    }),
  }).refine(data => (data.daily_counts === undefined) === (data.daily_counts_timezone === undefined),
    'Série diária e seu calendário devem ser informados juntos.'),
});

export type AdminDashboard = z.infer<typeof dashboardResponseSchema>['data'];

export const recentOccurrencesResponseSchema = z.object({
  data: z.array(z.object({
    id: z.string().min(1),
    category: z.object({ name: z.string() }),
    description: z.string(),
    status: z.enum([
      'RECEIVED', 'UNDER_ANALYSIS', 'CONFIRMED',
      'IN_SERVICE', 'RESOLVED', 'REJECTED',
    ]),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).nullable(),
    createdAt: z.string().min(1),
  })),
  pagination: z.object({
    page: count,
    pageSize: count,
    total: count,
    totalPages: count,
  }),
});

export type RecentOccurrence = z.infer<typeof recentOccurrencesResponseSchema>['data'][number];

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const response: unknown = await http('/admin/dashboard');
  return dashboardResponseSchema.parse(response).data;
}

export async function getRecentAdminOccurrences(): Promise<RecentOccurrence[]> {
  const response: unknown = await http('/admin/occurrences?page=1&pageSize=5&sort=recent');
  return recentOccurrencesResponseSchema.parse(response).data;
}

// Sempre exibir seis status, inclusive zeros do banco; nunca somar a partir da página recente.
export const dashboardStatuses: ReadonlyArray<{
  key: OccurrenceStatus; label: string; border: string;
}> = [
  { key: 'RECEIVED', label: 'Recebido', border: 'border-slate-400' },
  { key: 'UNDER_ANALYSIS', label: 'Em análise', border: 'border-yellow-400' },
  { key: 'CONFIRMED', label: 'Confirmado', border: 'border-sky-500' },
  { key: 'IN_SERVICE', label: 'Em atendimento', border: 'border-orange-500' },
  { key: 'RESOLVED', label: 'Resolvido', border: 'border-emerald-500' },
  { key: 'REJECTED', label: 'Rejeitado', border: 'border-red-500' },
];

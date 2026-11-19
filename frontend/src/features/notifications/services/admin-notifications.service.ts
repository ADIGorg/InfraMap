import { AdminOccurrencesService, type AdminOccurrence } from '@/features/occurrences/services/admin-occurrences.service';
import { getAdminDashboard, type AdminDashboard } from '@/features/dashboard/services/dashboard.service';

export const AdminNotificationsService = {
  occurrences: (page: number, signal?: AbortSignal) =>
    AdminOccurrencesService.list({ page, pageSize: 20, sort: 'recent' }, signal),
  dashboard: getAdminDashboard,
};

export interface AdminAlert {
  id: string;
  revision: string;
  kind: 'occurrence' | 'sla';
  title: string;
  to: string;
  date?: string;
}

export function deriveAlerts(occurrences: AdminOccurrence[], dashboard?: AdminDashboard): AdminAlert[] {
  const alerts: AdminAlert[] = [];
  const breaches = dashboard?.sla_breaches;
  if (breaches) {
    for (const [key, count, label, status] of [
      ['received', breaches.received_over_48h, 'ocorrências recebidas há mais de 48 horas', 'RECEIVED'],
      ['analysis', breaches.under_analysis_over_5d, 'ocorrências em análise há mais de 5 dias', 'UNDER_ANALYSIS'],
    ] as const) {
      if (count > 0) alerts.push({ id: 'sla-' + key, revision: String(count), kind: 'sla',
        title: `${count} ${label}`, to: '/admin/occurrences?status=' + status });
    }
  }
  for (const item of new Map(occurrences.map(item => [item.id, item])).values()) {
    alerts.push({ id: item.id, revision: item.createdAt, kind: 'occurrence',
      title: `Ocorrência #OC-${item.id.slice(0, 4).toUpperCase()} registrada — ${item.category.name}`,
      to: '/admin/occurrences/' + item.id, date: item.createdAt });
  }
  return alerts;
}

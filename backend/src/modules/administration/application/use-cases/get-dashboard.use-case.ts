export interface Dashboard {
  counts_by_status: {
    RECEIVED: number;
    UNDER_ANALYSIS: number;
    CONFIRMED: number;
    IN_SERVICE: number;
    RESOLVED: number;
    REJECTED: number;
  };
  high_priority_total: number;
  average_resolution_days: number | null;
  /** RN055/RN057 — alertas de SLA violado (migration `add_sla_to_admin_dashboard`). */
  sla_breaches: {
    received_over_48h: number;
    under_analysis_over_5d: number;
  };
}

export interface DashboardRepository {
  getDashboard(): Promise<Dashboard>;
}

export function getDashboard(repository: DashboardRepository): Promise<Dashboard> {
  return repository.getDashboard();
}
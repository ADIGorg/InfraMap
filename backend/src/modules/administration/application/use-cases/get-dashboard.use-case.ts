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
}

export interface DashboardRepository {
  getDashboard(): Promise<Dashboard>;
}

export function getDashboard(repository: DashboardRepository): Promise<Dashboard> {
  return repository.getDashboard();
}

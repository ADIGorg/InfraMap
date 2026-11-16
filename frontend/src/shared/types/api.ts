export type AdminLevel = 'MASTER' | 'OPERATIONAL';
export type UserRole = 'ADMIN' | 'CITIZEN';

export type OccurrenceStatus =
  | 'RECEIVED' | 'UNDER_ANALYSIS' | 'CONFIRMED'
  | 'IN_SERVICE' | 'RESOLVED' | 'REJECTED';
export type OccurrencePriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
export interface Page<T> {
  data: T[];
  pagination: Pagination;
}
export type ApiData<T> = { data: T };
export type ApiFailure = { error: { code: string; message: string } };

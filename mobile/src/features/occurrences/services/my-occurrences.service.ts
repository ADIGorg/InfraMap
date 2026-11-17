import { http } from '@/infrastructure/api/http-client';
import type {
  MyOccurrencesResponse,
  MyOccurrencesFilters,
} from '@/shared/types/api';

export async function getMyOccurrences(
  filters: MyOccurrencesFilters = {},
): Promise<MyOccurrencesResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters.statuses?.length) params.set('statuses', filters.statuses.join(','));
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.sort) params.set('sort', filters.sort);

  return http<MyOccurrencesResponse>(
    `/occurrences/mine?${params.toString()}`,
  );
}
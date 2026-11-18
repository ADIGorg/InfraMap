import { http } from '@/infrastructure/api/http-client';
import type {
  PublicOccurrenceListResponse,
  PublicMapFilters,
  PublicOccurrenceDetail,
  CategorySummary,
} from '@/shared/types/api';

export async function getPublicOccurrences(
  filters: PublicMapFilters,
): Promise<PublicOccurrenceListResponse> {
  const params = new URLSearchParams();
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.bbox) {
    params.set('minLat', String(filters.bbox.minLat));
    params.set('maxLat', String(filters.bbox.maxLat));
    params.set('minLng', String(filters.bbox.minLng));
    params.set('maxLng', String(filters.bbox.maxLng));
  }
  if (filters.sort) params.set('sort', filters.sort);
  params.set('pageSize', '100');

  return http<PublicOccurrenceListResponse>(
    `/occurrences/public?${params.toString()}`,
    { auth: false, raw: true  },
  );
}

export async function getPublicOccurrenceById(
  id: string,
): Promise<PublicOccurrenceDetail> {
  return http<PublicOccurrenceDetail>(`/occurrences/public/${id}`, { auth: false });
}

export async function getCategories(): Promise<CategorySummary[]> {
  return http<CategorySummary[]>('/categories', { auth: false });
}
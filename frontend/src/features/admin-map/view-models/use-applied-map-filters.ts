import { useQuery } from '@tanstack/react-query';
import { listNeighborhoods } from '@/features/occurrences/services/extra-filters';
import type { MapCategory, MapFilters } from '../services/admin-occurrences.service';
import { describeAppliedMapFilters } from '../services/map-filter-presentation';

export function useAppliedMapFilters(filters: MapFilters, categories?: MapCategory[]) {
  const neighborhoods = useQuery({ queryKey: ['admin', 'neighborhoods'], queryFn: listNeighborhoods,
    enabled: !!filters.neighborhoodId, retry: false, staleTime: 300_000 });
  return describeAppliedMapFilters(filters, categories, neighborhoods.data);
}

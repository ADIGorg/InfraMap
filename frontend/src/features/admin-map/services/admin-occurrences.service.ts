import { z } from 'zod';
import { http } from '@/infrastructure/api/http-client';
import { extraFiltersSchema, type ExtraFilters } from '@/features/occurrences/services/extra-filters';

export const ACTIVE_STATUSES = [
  'RECEIVED', 'UNDER_ANALYSIS', 'CONFIRMED', 'IN_SERVICE',
] as const;

export type ActiveStatus = typeof ACTIVE_STATUSES[number];
export type Bounds = { minLat: number; maxLat: number; minLng: number; maxLng: number };
export type GeoPoint = { lat: number; lng: number };
export type MapFilters = ExtraFilters & { statuses: ActiveStatus[]; categoryId: string; bbox: Bounds | null };

export const DEFAULT_FILTERS: MapFilters = {
  statuses: [...ACTIVE_STATUSES],
  categoryId: '',
  bbox: null,
};

const pointSchema = z.object({ lat: z.number().finite().min(-90).max(90), lng: z.number().finite().min(-180).max(180) });
const prioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']).nullable();
const statusSchema = z.enum(['RECEIVED', 'UNDER_ANALYSIS', 'CONFIRMED', 'IN_SERVICE', 'RESOLVED', 'REJECTED']);
const itemSchema = z.object({
  id: z.uuid(),
  status: statusSchema,
  category: z.object({ id: z.uuid(), code: z.string(), name: z.string() }),
  description: z.string(),
  location: pointSchema,
  priority: prioritySchema,
  createdAt: z.string(),
});

export const adminOccurrencesSchema = z.object({
  data: z.array(itemSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});

const categoryResponseSchema = z.object({
  data: z.array(z.object({ id: z.uuid(), name: z.string(), code: z.string() })),
});
const detailResponseSchema = z.object({
  data: itemSchema.extend({
    locationOriginal: pointSchema,
    locationAdjusted: pointSchema.nullable(),
  }),
});

export type AdminMapOccurrence = z.infer<typeof itemSchema>;
export type AdminMapOccurrenceDetail = z.infer<typeof detailResponseSchema>['data'];
export type MapCategory = z.infer<typeof categoryResponseSchema>['data'][number];

export function isActiveStatus(value: string): value is ActiveStatus {
  return (ACTIVE_STATUSES as readonly string[]).includes(value);
}

export function validateBounds(bbox: Bounds): Bounds {
  const { minLat, maxLat, minLng, maxLng } = bbox;
  const valid = [minLat, maxLat, minLng, maxLng].every(Number.isFinite)
    && minLat >= -90 && maxLat <= 90 && minLng >= -180 && maxLng <= 180
    && minLat <= maxLat && minLng <= maxLng;
  if (!valid) throw new Error('Área inválida. Selecione uma região sem cruzar o meridiano 180°.');
  return bbox;
}

export function createAdminMapQuery(filters: MapFilters, page: number): string {
  const extra = extraFiltersSchema.parse(filters);
  if (!filters.statuses.length) throw new Error('Selecione pelo menos um status.');
  const params = new URLSearchParams({
    page: String(page),
    pageSize: '100',
    sort: 'recent',
    status: filters.statuses.join(','),
  });
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  for (const [key, value] of Object.entries(extra)) if (value !== undefined) params.set(key, value);
  if (filters.bbox) {
    const bbox = validateBounds(filters.bbox);
    for (const key of ['minLat', 'maxLat', 'minLng', 'maxLng'] as const) {
      params.set(key, String(bbox[key]));
    }
  }
  return '/admin/occurrences?' + params.toString();
}

/** Pagina até o fim; nunca tratar apenas a primeira página como todo o mapa. */
export async function listActiveAdminOccurrences(
  filters: MapFilters,
  signal?: AbortSignal,
): Promise<AdminMapOccurrence[]> {
  if (!filters.statuses.length) return [];
  const result: AdminMapOccurrence[] = [];
  const maxPages = 100;
  let page = 1;
  let totalPages = 1;
  do {
    const raw = await http<unknown>(createAdminMapQuery(filters, page), { signal });
    const response = adminOccurrencesSchema.parse(raw);
    if (response.pagination.page !== page) throw new Error('A paginação da API não corresponde à consulta.');
    result.push(...response.data.filter((o) => isActiveStatus(o.status)));
    totalPages = response.pagination.totalPages;
    if (totalPages > maxPages) {
      throw new Error('Há mais de 10.000 ocorrências nesta área. Amplie os filtros antes de exibir o mapa.');
    }
    page++;
  } while (page <= totalPages);

  // Evitar duplicações caso itens mudem de página durante a consulta.
  return [...new Map(result.map((item) => [item.id, item])).values()];
}

export async function listMapCategories(): Promise<MapCategory[]> {
  const raw = await http<unknown>('/categories', { auth: false });
  return categoryResponseSchema.parse(raw).data;
}

export async function getAdminMapOccurrenceDetail(id: string): Promise<AdminMapOccurrenceDetail> {
  const raw = await http<unknown>('/admin/occurrences/' + encodeURIComponent(id));
  return detailResponseSchema.parse(raw).data;
}

export async function adjustAdminOccurrenceLocation(
  id: string,
  position: GeoPoint,
): Promise<void> {
  pointSchema.parse(position);
  await http<unknown>('/admin/occurrences/' + encodeURIComponent(id) + '/location', {
    method: 'PATCH',
    body: position,
  });
}

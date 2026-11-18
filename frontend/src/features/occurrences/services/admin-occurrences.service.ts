import { z } from 'zod';
import { http } from '@/infrastructure/api/http-client';

export const statusOptions = [
  ['RECEIVED', 'Recebido'], ['UNDER_ANALYSIS', 'Em análise'],
  ['CONFIRMED', 'Confirmado'], ['IN_SERVICE', 'Em atendimento'],
  ['RESOLVED', 'Resolvido'], ['REJECTED', 'Rejeitado'],
] as const;
const statusSchema = z.enum(['RECEIVED', 'UNDER_ANALYSIS', 'CONFIRMED', 'IN_SERVICE', 'RESOLVED', 'REJECTED']);
const coordinate = (min: number, max: number) => z.coerce.number().finite().min(min).max(max).optional();
export const filtersSchema = z.object({
  page: z.coerce.number().int().min(1).max(Number.MAX_SAFE_INTEGER).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['recent', 'oldest', 'most_liked']).default('recent'),
  categoryId: z.uuid().optional(),
  status: z.array(statusSchema).min(1).optional(),
  minLat: coordinate(-90, 90), maxLat: coordinate(-90, 90),
  minLng: coordinate(-180, 180), maxLng: coordinate(-180, 180),
}).superRefine((value, context) => {
  const bounds = [value.minLat, value.maxLat, value.minLng, value.maxLng];
  if (bounds.some(item => item !== undefined) && bounds.some(item => item === undefined)) {
    context.addIssue({ code: 'custom', message: 'Informe os quatro limites da região.' });
  }
  if (value.minLat !== undefined && value.maxLat !== undefined && value.minLat > value.maxLat) {
    context.addIssue({ code: 'custom', message: 'A latitude mínima deve ser menor ou igual à máxima.' });
  }
  if (value.minLng !== undefined && value.maxLng !== undefined && value.minLng > value.maxLng) {
    context.addIssue({ code: 'custom', message: 'A longitude mínima deve ser menor ou igual à máxima.' });
  }
});
export type AdminOccurrenceFilters = z.infer<typeof filtersSchema>;
export function parseFilters(params: URLSearchParams) {
  return filtersSchema.safeParse({
    ...Object.fromEntries(params),
    status: params.has('status') ? params.getAll('status').flatMap(value => value.split(',')) : undefined,
  });
}
export function serializeFilters(filters: AdminOccurrenceFilters) {
  const params = new URLSearchParams();
  Object.entries(filtersSchema.parse(filters)).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, Array.isArray(value) ? value.join(',') : String(value));
  });
  return params;
}
const categorySchema = z.object({ id: z.string(), code: z.string(), name: z.string() });
const itemSchema = z.object({
  id: z.uuid(), category: categorySchema, description: z.string(),
  status: statusSchema, priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).nullable(),
  location: z.object({ lat: z.number().finite().min(-90).max(90), lng: z.number().finite().min(-180).max(180) }),
  createdAt: z.iso.datetime({ offset: true }),
});
const pageSchema = z.object({
  data: z.array(itemSchema),
  pagination: z.object({
    page: z.number().int().positive(), pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative(),
  }),
});
export type AdminOccurrence = z.infer<typeof itemSchema>;
export const AdminOccurrencesService = {
  async list(filters: AdminOccurrenceFilters, signal?: AbortSignal) {
    return pageSchema.parse(await http<unknown>('/admin/occurrences?' + serializeFilters(filters), { signal }));
  },
  async categories(signal?: AbortSignal) {
    return z.object({ data: z.array(categorySchema) }).parse(await http<unknown>('/categories', { signal })).data;
  },
};


import { z } from 'zod';
import { http } from '@/infrastructure/api/http-client';

export const extraFilterShape = {
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'UNDEFINED']).optional(),
  q: z.string().trim().min(1).max(200).optional(),
  neighborhoodId: z.uuid().optional(),
  createdFrom: z.iso.datetime({ offset: true }).optional(),
  createdBefore: z.iso.datetime({ offset: true }).optional(),
};
export const extraFiltersSchema = z.object(extraFilterShape).refine(value =>
  !value.createdFrom || !value.createdBefore || Date.parse(value.createdFrom) < Date.parse(value.createdBefore),
  'O início do período deve ser anterior ao fim.');
export type ExtraFilters = z.infer<typeof extraFiltersSchema>;
export async function listNeighborhoods() {
  return z.object({ data: z.array(z.object({ id: z.uuid(), name: z.string(), municipality: z.string() })) })
    .parse(await http('/admin/occurrences/neighborhoods')).data;
}

import { z } from 'zod';
import { http } from '@/infrastructure/api/http-client';
import { itemSchema } from './admin-occurrences.service';

const point = z.object({ lat: z.number(), lng: z.number() });
export const detailSchema = itemSchema.extend({
  author: z.object({ id: z.string(), name: z.string() }),
  locationOriginal: point,
  locationAdjusted: point.nullable(),
  categorySource: z.string(),
  descriptionSource: z.string(),
  photoUrls: z.array(z.object({
    position: z.number(),
    url: z.url().refine(value => ['http:', 'https:'].includes(new URL(value).protocol)),
    expiresAt: z.iso.datetime({ offset: true }),
  })),
});
export type OccurrenceDetail = z.infer<typeof detailSchema>;
export async function getOccurrenceDetail(id: string, signal?: AbortSignal) {
  const result = await http<unknown>('/admin/occurrences/' + id, { signal });
  return z.object({ data: detailSchema }).parse(result).data;
}


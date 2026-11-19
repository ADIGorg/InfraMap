import { z } from 'zod';
import { http } from '@/infrastructure/api/http-client';

const historySchema = z.object({
  id: z.string(), type: z.enum(['history', 'observation']), action: z.string(),
  actorId: z.string().nullable(), createdAt: z.iso.datetime({ offset: true }),
  content: z.string().nullable().optional(),
  visibility: z.enum(['INTERNAL', 'CITIZEN_RESPONSE']).optional(),
  details: z.record(z.string(), z.unknown()).nullable(),
  previousData: z.record(z.string(), z.unknown()).nullable().optional(),
  newData: z.record(z.string(), z.unknown()).nullable().optional(),
});
export async function getOccurrenceHistory(id: string, signal?: AbortSignal) {
  return z.object({ data: z.array(historySchema) }).parse(
    await http<unknown>('/occurrences/' + id + '/history', { signal }),
  ).data;
}


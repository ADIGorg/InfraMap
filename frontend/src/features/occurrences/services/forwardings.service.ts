import { z } from 'zod';
import { http } from '@/infrastructure/api/http-client';

export const forwardingInputSchema = z.object({
  agency_id: z.uuid('Selecione um órgão.'),
  observations: z.string().trim().max(2000).optional(),
});
export type ForwardingInput = z.infer<typeof forwardingInputSchema>;
const forwardingSchema = z.object({
  id: z.string(), agencyId: z.string(), status: z.enum(['PENDING', 'SENT', 'FAILED']),
  recipientEmail: z.string(), createdAt: z.iso.datetime({ offset: true }),
  observations: z.string().nullable(), agencyName: z.string().optional(),
});
export async function getForwardings(id: string, signal?: AbortSignal) {
  return z.object({ data: z.array(forwardingSchema) }).parse(
    await http<unknown>('/admin/occurrences/' + id + '/forwardings', { signal }),
  ).data;
}
export async function createForwarding(id: string, input: ForwardingInput) {
  return z.object({ data: forwardingSchema }).parse(await http<unknown>(
    '/admin/occurrences/' + id + '/forwardings',
    { method: 'POST', body: forwardingInputSchema.parse(input) },
  )).data;
}


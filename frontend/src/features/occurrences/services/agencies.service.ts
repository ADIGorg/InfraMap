import { z } from 'zod';
import { http } from '@/infrastructure/api/http-client';

export async function getAgencies(signal?: AbortSignal) {
  return z.object({ data: z.array(z.object({
    id: z.uuid(), name: z.string(), email: z.string(), is_active: z.boolean(),
  })) }).parse(await http<unknown>('/admin/agencies', { signal })).data;
}


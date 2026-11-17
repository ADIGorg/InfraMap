import { z } from 'zod';
import { http } from '@/infrastructure/api/http-client';

export const adminIdentitySchema = z.object({
  id: z.uuid(),
  role: z.literal('ADMIN'),
  is_active: z.boolean(),
  // API1-100 ainda não concluída; ausência de nível bloqueia MASTER.
  admin_level: z.enum(['MASTER', 'OPERATIONAL']).optional(),
});
export type AdminIdentity = z.infer<typeof adminIdentitySchema>;

export async function getAdminIdentity(): Promise<AdminIdentity> {
  const response: unknown = await http<unknown>('/admin/me');
  return adminIdentitySchema.parse(response);
}

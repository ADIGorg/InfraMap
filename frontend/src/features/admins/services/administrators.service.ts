import { z } from 'zod';
import { http } from '@/infrastructure/api/http-client';

const level = z.enum(['MASTER', 'OPERATIONAL']);
const identityFields = z.object({ id: z.uuid(), admin_level: level, is_active: z.boolean(), created_by: z.uuid().nullable() });
const administrator = identityFields.extend({ name: z.string(), email: z.email().nullable() });
export type Administrator = z.infer<typeof administrator>;
export const createAdministratorSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome.').max(150, 'Máximo de 150 caracteres.'),
  email: z.string().trim().pipe(z.email('Informe um e-mail válido.').max(254)),
  password: z.string().min(8, 'Use pelo menos 8 caracteres.').max(72, 'Use no máximo 72 caracteres.'),
  admin_level: level,
});
export type CreateAdministrator = z.infer<typeof createAdministratorSchema>;
const changesSchema = z.object({ admin_level: level.optional(), is_active: z.boolean().optional() })
  .refine(value => Object.values(value).some(item => item !== undefined));
export type AdministratorChanges = z.infer<typeof changesSchema>;
export const AdministratorsService = {
  async list(signal?: AbortSignal) {
    return z.object({ data: z.array(administrator) }).parse(await http('/admin/admins', { signal })).data;
  },
  async create(input: CreateAdministrator) {
    return z.object({ data: administrator }).parse(await http('/admin/admins', {
      method: 'POST', body: createAdministratorSchema.parse(input),
    })).data;
  },
  async update(id: string, changes: AdministratorChanges) {
    return z.object({ data: identityFields }).parse(await http('/admin/admins/' + z.uuid().parse(id), {
      method: 'PATCH', body: changesSchema.parse(changes),
    })).data;
  },
};

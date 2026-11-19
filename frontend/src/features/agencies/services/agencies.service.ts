import { z } from 'zod';
import { http } from '@/infrastructure/api/http-client';

export const agencySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  description: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
const agencyResponseSchema = z.object({ data: agencySchema });
const agencyListResponseSchema = z.object({ data: z.array(agencySchema) });
export type Agency = z.infer<typeof agencySchema>;

// Campos alinhados a backend/src/modules/administration/presentation/agencies.schema.ts
export const agencyFormSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do órgão.').max(150, 'Máximo de 150 caracteres.'),
  email: z.string().trim().pipe(z.email('Informe um e-mail válido.').max(150, 'Máximo de 150 caracteres.')),
  phone: z.string().trim().max(20, 'Máximo de 20 caracteres.'),
  description: z.string().trim(),
});
export type AgencyFormValues = z.input<typeof agencyFormSchema>;
export type AgencyWriteInput = {
  name: string;
  email: string;
  phone: string | null;
  description: string | null;
};

export function agencyInputFromForm(values: AgencyFormValues): AgencyWriteInput {
  const parsed = agencyFormSchema.parse(values);
  return {
    name: parsed.name,
    email: parsed.email,
    phone: parsed.phone || null,
    description: parsed.description || null,
  };
}

export async function listAgencies(signal?: AbortSignal): Promise<Agency[]> {
  const raw: unknown = await http('/admin/agencies', { signal });
  return agencyListResponseSchema.parse(raw).data;
}

export async function createAgency(input: AgencyWriteInput): Promise<Agency> {
  const raw: unknown = await http('/admin/agencies', { method: 'POST', body: input });
  return agencyResponseSchema.parse(raw).data;
}

export async function updateAgency(
  id: string,
  changes: Partial<AgencyWriteInput> & { is_active?: boolean },
): Promise<Agency> {
  z.uuid().parse(id);
  const raw: unknown = await http('/admin/agencies/' + encodeURIComponent(id), {
    method: 'PATCH', body: changes,
  });
  return agencyResponseSchema.parse(raw).data;
}
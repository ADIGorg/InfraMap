import { z } from "zod";

export const createAgencySchema = z.strictObject({
  name: z.string().trim().min(1).max(150),
  email: z.string().trim().pipe(z.email().max(150)),
  phone: z.string().trim().min(1).max(20).nullable().optional(),
  description: z.string().trim().nullable().optional(),
  is_active: z.boolean().optional(),
});

export const updateAgencySchema = createAgencySchema.partial()
  .refine(value => Object.keys(value).length > 0, "Informe pelo menos um campo.");
export const agencyIdSchema = z.object({ id: z.uuid() });

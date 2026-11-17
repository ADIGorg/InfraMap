import { z } from 'zod';

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(150, 'Nome deve ter no máximo 150 caracteres'),
  phone: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || (v.length >= 8 && v.length <= 20),
      'Telefone deve ter entre 8 e 20 caracteres',
    ),
});

export type ProfileInput = z.infer<typeof profileSchema>;
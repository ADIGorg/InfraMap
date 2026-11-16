import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Informe seu e-mail')
    .email('E-mail inválido')
    .max(254, 'E-mail muito longo'),
  password: z
    .string()
    .min(1, 'Informe sua senha')
    .max(72, 'Senha muito longa'),
});

export type LoginInput = z.infer<typeof loginSchema>;
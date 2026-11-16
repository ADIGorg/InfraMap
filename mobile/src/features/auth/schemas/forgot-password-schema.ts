import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Informe seu e-mail')
    .email('E-mail inválido')
    .max(254, 'E-mail muito longo'),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
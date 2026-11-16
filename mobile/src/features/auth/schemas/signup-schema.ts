import { z } from 'zod';

export const signupSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, 'Nome deve ter no mínimo 3 caracteres')
      .max(150, 'Nome deve ter no máximo 150 caracteres'),
    email: z
      .string()
      .trim()
      .min(1, 'Informe seu e-mail')
      .email('E-mail inválido')
      .max(254, 'E-mail muito longo'),
    password: z
      .string()
      .min(8, 'Senha deve ter no mínimo 8 caracteres')
      .max(72, 'Senha deve ter no máximo 72 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme sua senha'),
    acceptedTerms: z.literal(true, {
      errorMap: () => ({ message: 'Você precisa aceitar os Termos de Uso' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Senhas não coincidem',
    path: ['confirmPassword'],
  });

export type SignupInput = z.infer<typeof signupSchema>;
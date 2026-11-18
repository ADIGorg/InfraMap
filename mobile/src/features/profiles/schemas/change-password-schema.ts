import { z } from 'zod';

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'Informe sua senha atual'),

    newPassword: z
      .string()
      .min(8, 'Senha deve ter no mínimo 8 caracteres')
      .max(72, 'Senha deve ter no máximo 72 caracteres'),

    confirmPassword: z
      .string()
      .min(1, 'Confirme sua nova senha'),
  })
  .refine(
    (data) =>
      data.newPassword === data.confirmPassword,
    {
      message: 'Senhas não coincidem',
      path: ['confirmPassword'],
    },
  )
  .refine(
    (data) =>
      data.newPassword !== data.currentPassword,
    {
      message: 'A nova senha deve ser diferente da senha atual',
      path: ['newPassword'],
    },
  );

export type ChangePasswordInput = z.infer<
  typeof changePasswordSchema
>;
import { z } from 'zod';

const phoneSchema = z.string().trim().refine((value) => {
  if (value === '') return true;
  if (!/^\+?[0-9 ()-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, '').length;
  return digits >= 8 && digits <= 15;
}, 'Informe um telefone válido com 8 a 15 dígitos.').transform((value) => value || null);

export const editAdminProfileSchema = z.object({
  name: z.string().trim().min(3, 'O nome deve ter pelo menos 3 caracteres.').max(150),
  phone: phoneSchema,
});

export const changeAdminPasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual.'),
  newPassword: z.string().min(8, 'Use pelo menos 8 caracteres.').max(72, 'Use no máximo 72 caracteres.'),
  confirmPassword: z.string().min(1, 'Confirme a nova senha.'),
}).refine(
  (values) => values.currentPassword !== values.newPassword,
  { path: ['newPassword'], message: 'A nova senha deve ser diferente da atual.' },
).refine(
  (values) => values.newPassword === values.confirmPassword,
  { path: ['confirmPassword'], message: 'A confirmação não corresponde à nova senha.' },
);

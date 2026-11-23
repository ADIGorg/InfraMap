import { z } from 'zod';
import { http } from '@/infrastructure/api/http-client';
import { supabase } from '@/infrastructure/api/supabase-client';
import { AppError } from '@/shared/errors/app-error';

const accountProfileSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  phone: z.string().nullable(),
  email: z.string().email().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
const profileEnvelopeSchema = z.object({ data: accountProfileSchema });

export type AdminAccountProfile = z.infer<typeof accountProfileSchema>;
export type EditAdminProfile = { name: string; phone: string | null };

export async function getAdminProfile(): Promise<AdminAccountProfile> {
  const response: unknown = await http('/identity/me');
  return profileEnvelopeSchema.parse(response).data;
}

export async function updateAdminProfile(changes: EditAdminProfile): Promise<AdminAccountProfile> {
  const response: unknown = await http('/identity/me', { method: 'PATCH', body: changes });
  return profileEnvelopeSchema.parse(response).data;
}

// Reaproveita Supabase Auth e exige a senha atual independentemente das opções
// de segurança habilitadas no projeto. Senhas não passam pela API Express.
export async function changeAdminPassword(currentPassword: string, newPassword: string): Promise<void> {
  const { data: current, error: userError } = await supabase.auth.getUser();
  const user = current.user;
  if (userError || !user?.id || !user.email) {
    throw new AppError(401, 'UNAUTHORIZED', 'Sua sessão expirou. Entre novamente.');
  }

  const { data: verified, error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (signInError) {
    if (signInError.status === 429) {
      throw new AppError(429, 'RATE_LIMITED', 'Muitas tentativas. Aguarde antes de tentar novamente.');
    }
    throw new AppError(400, 'CURRENT_PASSWORD_MISMATCH', 'A senha atual está incorreta.');
  }
  if (!verified.user || verified.user.id !== user.id) {
    throw new AppError(401, 'UNAUTHORIZED', 'Não foi possível confirmar a identidade da sessão.');
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) {
    if (updateError.status === 429) {
      throw new AppError(429, 'RATE_LIMITED', 'Muitas tentativas. Aguarde antes de tentar novamente.');
    }
    throw new AppError(400, 'PASSWORD_UPDATE_FAILED',
      'Não foi possível alterar a senha. Verifique as políticas da conta ou use a recuperação de senha.');
  }
}

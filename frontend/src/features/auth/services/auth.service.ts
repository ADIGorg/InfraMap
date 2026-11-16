import { supabase } from '@/infrastructure/api/supabase-client';
import { AppError } from '@/shared/errors/app-error';

export async function signInAdmin(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new AppError(401, 'INVALID_CREDENTIALS', 'Credenciais inválidas.');
}
export async function requestPasswordReset(email: string, redirectTo: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new AppError(503, 'AUTH_UNAVAILABLE', 'Não foi possível solicitar a recuperação.');
}
export async function signOutAdmin(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new AppError(503, 'LOGOUT_FAILED', 'Não foi possível encerrar a sessão.');
}

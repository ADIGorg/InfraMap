import { supabase } from '@/infrastructure/api/supabase-client';
import { AppError } from '@/shared/errors/app-error';

export async function signInAdmin(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  // Não expor detalhes de existência de contas ou credenciais.
  if (error) throw new AppError(401, 'INVALID_CREDENTIALS', 'Não foi possível autenticar.');
}

export async function requestPasswordReset(email: string, redirectTo: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
  if (error) {
    if (error.status === 429) {
      throw new AppError(429, 'RESET_RATE_LIMIT', 'Muitas solicitações. Aguarde antes de tentar novamente.');
    }
    throw new AppError(503, 'RESET_UNAVAILABLE', 'Não foi possível solicitar a recuperação.');
  }
}

export async function verifyRecoveryToken(tokenHash: string): Promise<void> {
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
  if (error || !data.session) {
    throw new AppError(401, 'RECOVERY_LINK_INVALID', 'Este link é inválido ou expirou.');
  }
}

export async function changeRecoveredPassword(password: string): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new AppError(401, 'RECOVERY_SESSION_EXPIRED', 'A recuperação expirou. Solicite outro link.');
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new AppError(400, 'RESET_FAILED', 'Não foi possível salvar a nova senha.');
  // Um link de recuperação não deve deixar o navegador autenticado como o usuário.
  await supabase.auth.signOut();
}

export async function signOutAdmin(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new AppError(503, 'LOGOUT_FAILED', 'Não foi possível encerrar a sessão.');
}

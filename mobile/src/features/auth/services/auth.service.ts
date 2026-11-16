import { supabase } from '@/infrastructure/api/supabase-auth';
import { http } from '@/infrastructure/api/http-client';
import { AppError } from '@/shared/errors/app-error';
import { IdentityResponse } from '@/shared/types/api';

// ─────────────────────────────────────
// LOGIN (MOB-UI-02)
// ─────────────────────────────────────
export async function loginWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    if (error.code === 'invalid_credentials') {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha inválidos.');
    }
    if (error.code === 'email_not_confirmed') {
      throw new AppError(403, 'EMAIL_NOT_CONFIRMED', 'Confirme seu e-mail antes de entrar.');
    }
    if (error.code === 'too_many_requests' || error.code === 'over_email_send_rate_limit') {
      throw new AppError(429, 'TOO_MANY_REQUESTS', 'Muitas tentativas. Aguarde alguns minutos.');
    }
    throw new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha inválidos.');
  }

  return data.session;
}

// ─────────────────────────────────────
// SIGNUP (MOB-UI-03)
// ─────────────────────────────────────
export async function signup(input: { name: string; email: string; password: string }) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      // Popula raw_user_meta_data.name → trigger handle_new_user cria profiles.name
      data: { name: input.name.trim() },
    },
  });

  if (error) {
    if (error.code === 'user_already_exists') {
      throw new AppError(409, 'EMAIL_EXISTS', 'Este e-mail já está cadastrado.');
    }
    if (error.code === 'weak_password') {
      throw new AppError(400, 'WEAK_PASSWORD', 'Senha muito fraca. Use no mínimo 8 caracteres.');
    }
    throw new AppError(400, 'SIGNUP_FAILED', error.message);
  }

  if (!data.user) {
    throw new AppError(500, 'SIGNUP_FAILED', 'Erro ao criar conta. Tente novamente.');
  }

  // session === null quando confirmação de e-mail está habilitada (staging/prod)
  return { user: data.user, session: data.session };
}

export async function resendConfirmationEmail(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
  });
  if (error) {
    throw new AppError(400, 'RESEND_FAILED', 'Não foi possível reenviar. Tente novamente.');
  }
}

// ─────────────────────────────────────
// IDENTIDADE E LOGOUT (compartilhados)
// ─────────────────────────────────────
export async function validateCitizenIdentity(): Promise<IdentityResponse> {
  const identity = await http<IdentityResponse>('/app/me');
  if (identity.role !== 'CITIZEN') {
    throw new AppError(403, 'NOT_CITIZEN', 'Use o painel administrativo no navegador.');
  }
  if (!identity.is_active) {
    throw new AppError(403, 'INACTIVE_ACCOUNT', 'Conta inativa. Contate o suporte.');
  }
  return identity;
}

export async function logout() {
  await supabase.auth.signOut();
}

// ─────────────────────────────────────
// PASSWORD RECOVERY (MOB-UI-04)
// ─────────────────────────────────────
import * as Linking from 'expo-linking';

export async function requestPasswordReset(email: string): Promise<void> {
  const redirectTo = Linking.createURL('/reset-password');

  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo },
  );

  if (error) {
    if (
      error.code === 'over_email_send_rate_limit' ||
      error.code === 'too_many_requests'
    ) {
      throw new AppError(
        429,
        'TOO_MANY_REQUESTS',
        'Muitas solicitações. Aguarde alguns minutos.',
      );
    }
    // Falha de rede/timeout — permite retry controlado
    if (
      error.name === 'AuthRetryableFetchError' ||
      (error as { status?: number }).status === 0
    ) {
      throw new AppError(500, 'NETWORK_ERROR', 'Erro de conexão.');
    }
    // Anti-enumeração: qualquer outro erro (incluindo "user not found")
    // é absorvido. O Supabase por padrão já não revela existência em
    // resetPasswordForEmail, mas mantemos defensivo.
  }
}
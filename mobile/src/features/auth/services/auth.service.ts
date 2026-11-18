import { supabase } from '@/infrastructure/api/supabase-auth';
import { http } from '@/infrastructure/api/http-client';
import { AppError } from '@/shared/errors/app-error';
import { IdentityResponse } from '@/shared/types/api';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';

// ─────────────────────────────────────
// LOGIN
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
// SIGNUP
// ─────────────────────────────────────
export async function signup(input: {
  name: string;
  email: string;
  password: string;
}) {
  const emailRedirectTo = Linking.createURL(
    'verify-email',
    {
      queryParams: {
        confirmed: 'true',
      },
    },
  );

  console.log( '[auth.service] signup redirect:', emailRedirectTo, );

  const {
    data,
    error,
  } = await supabase.auth.signUp({
    email: input.email
      .trim()
      .toLowerCase(),
    password: input.password,
    options: {
      data: {
        name: input.name.trim(),
      },
      emailRedirectTo,
    },
  });

  if (error) {
    if (error.code === 'user_already_exists') {
      throw new AppError(
        409,
        'EMAIL_EXISTS',
        'Este e-mail já está cadastrado.',
      );
    }

    if (error.code === 'weak_password') {
      throw new AppError(
        400,
        'WEAK_PASSWORD',
        'Senha muito fraca. Use no mínimo 8 caracteres.',
      );
    }

    throw new AppError(
      400,
      'SIGNUP_FAILED',
      error.message,
    );
  }

  if (!data.user) {
    throw new AppError(
      500,
      'SIGNUP_FAILED',
      'Erro ao criar conta. Tente novamente.',
    );
  }

  return {
    user: data.user,
    session: data.session,
  };
}

export async function resendConfirmationEmail(
  email: string,
): Promise<void> {
  const emailRedirectTo = Linking.createURL(
    'verify-email',
    {
      queryParams: {
        confirmed: 'true',
      },
    },
  );

  const {
    error,
  } = await supabase.auth.resend({
    type: 'signup',
    email: email
      .trim()
      .toLowerCase(),
    options: {
      emailRedirectTo,
    },
  });

  if (error) {
    if (
      error.status === 429 ||
      error.code === 'over_email_send_rate_limit' ||
      error.code === 'too_many_requests'
    ) {
      throw new AppError(
        429,
        'TOO_MANY_REQUESTS',
        'Muitas solicitações. Aguarde alguns minutos.',
      );
    }

    throw new AppError(
      error.status ?? 400,
      error.code ?? 'RESEND_FAILED',
      'Não foi possível reenviar o e-mail. Tente novamente.',
    );
  }
}

// ─────────────────────────────────────
// IDENTIDADE E LOGOUT
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
// PASSWORD RECOVERY (MOB-UI-04/05)
// ─────────────────────────────────────
export async function requestPasswordReset(email: string): Promise<void> {
  let redirectTo: string;
  try {
    if (Constants.executionEnvironment === 'storeClient') {
      // Expo Go — o link precisa ser exp://
      redirectTo = Linking.createURL('reset-password', { scheme: 'exp' });
    } else {
      // Dev client ou build nativo — inframap://
      redirectTo = Linking.createURL('reset-password');
    }
  } catch {
    redirectTo = 'inframap://reset-password';
  }

  console.log('[auth.service] redirectTo gerado:', redirectTo);

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo },
    );

    if (error) {
      const status = (error as { status?: number }).status ?? 0;
      const code = error.code ?? 'unknown';

      console.error('[auth.service] supabase raw error:', {
        name: error.name,
        code,
        status,
        message: error.message,
      });

      if (
        status === 429 ||
        code === 'over_email_send_rate_limit' ||
        code === 'too_many_requests'
      ) {
        throw new AppError(
          429,
          'TOO_MANY_REQUESTS',
          'Muitas solicitações. Aguarde alguns minutos.',
        );
      }

      if (status >= 500) {
        throw new AppError(
          503,
          'SERVER_UNAVAILABLE',
          'Serviço temporariamente indisponível. Tente novamente em instantes.',
        );
      }

      if (status === 0 || error.name === 'AuthRetryableFetchError') {
        throw new AppError(500, 'NETWORK_ERROR', 'Erro de conexão.');
      }

      // Outros (user_not_found, redirect_not_allowed) — absorver para anti-enumeração
    }
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(
      500,
      'RESET_FAILED',
      'Não foi possível enviar o e-mail. Tente novamente em instantes.',
    );
  }
}

// ─────────────────────────────────────
// UPDATE PASSWORD — RECOVERY FLOW
// ─────────────────────────────────────

export async function updatePassword(
  newPassword: string,
): Promise<void> {
  const {
    error,
  } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw new AppError(
      error.status ?? 400,
      error.code ?? 'PASSWORD_UPDATE_FAILED',
      error.message || 'Não foi possível alterar a senha.',
    );
  }
}

// ─────────────────────────────────────
// CHANGE PASSWORD — AUTHENTICATED USER
// ─────────────────────────────────────

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const {
    data: userData,
    error: userError,
  } = await supabase.auth.getUser();

  const email = userData.user?.email;

  if (userError || !email) {
    throw new AppError(
      401,
      'UNAUTHORIZED',
      'Sessão expirada. Faça login novamente.',
    );
  }

  const {
    error: authenticationError,
  } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (authenticationError) {
    throw new AppError(
      400,
      'CURRENT_PASSWORD_MISMATCH',
      'A senha atual está incorreta.',
    );
  }

  const {
    error: updateError,
  } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    throw new AppError(
      updateError.status ?? 400,
      updateError.code ?? 'PASSWORD_UPDATE_FAILED',
      updateError.message || 'Não foi possível alterar a senha.',
    );
  }
}

// ─────────────────────────────────────
// PARSE RECOVERY URL (MOB-UI-05)
// ─────────────────────────────────────
export interface ParsedRecoveryTokens {
  accessToken: string;
  refreshToken: string;
}

export function parseRecoveryUrl(url: string): ParsedRecoveryTokens | null {
  if (!url.includes('reset-password') && !url.includes('type=recovery')) {
    return null;
  }

  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return null;

  const fragment = url.slice(hashIndex + 1);
  const params = new URLSearchParams(fragment);

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const type = params.get('type');

  if (!accessToken || !refreshToken || type !== 'recovery') return null;

  return { accessToken, refreshToken };
}

export async function setSessionFromRecoveryUrl(url: string): Promise<boolean> {
  const parsed = parseRecoveryUrl(url);
  if (!parsed) return false;

  const { error } = await supabase.auth.setSession({
    access_token: parsed.accessToken,
    refresh_token: parsed.refreshToken,
  });

  if (error) {
    console.error('[auth.service] setSession failed:', error);
    return false;
  }

  return true;
}
import { http } from '@/infrastructure/api/http-client';
import { AppError } from '@/shared/errors/app-error';

export interface DeleteAccountResult {
  pendingAuthCleanup: boolean;
}

export async function deleteMyAccount(): Promise<DeleteAccountResult> {
  try {
    await http<void>('/identity/me', { method: 'DELETE' });
    return { pendingAuthCleanup: false };
  } catch (error) {
    // RN058: 503 ACCOUNT_DEACTIVATED_AUTH_PENDING significa que a
    // desativação ocorreu e a limpeza em auth.users está assíncrona.
    // Do ponto de vista do usuário, a conta foi excluída.
    if (
      error instanceof AppError &&
      error.code === 'ACCOUNT_DEACTIVATED_AUTH_PENDING'
    ) {
      return { pendingAuthCleanup: true };
    }
    throw error;
  }
}
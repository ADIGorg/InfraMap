
import {
  AppError,
  ForbiddenError,
  UnauthorizedError,
} from "../../../../shared/errors/app-error.js";

import type {
  ProfileReader,
} from "../../domain/repositories/identity.repository.js";

import type {
  AccountDeactivationRepository,
  AccountAuthGateway,
} from "../../domain/repositories/account-deactivation.repository.js";

/**
 * API1-44 — ID-02
 * Desativação e anonimização da própria conta.
 */
export class DeactivateMyAccountUseCase {
  constructor(
    private readonly identities: ProfileReader,
    private readonly accounts: AccountDeactivationRepository,
    private readonly auth: AccountAuthGateway
  ) {}

  async execute(
    userId: string | undefined,
    accessToken: string | undefined
  ): Promise<void> {
    if (!userId || !accessToken) {
      throw new UnauthorizedError();
    }

    const identity =
      await this.identities.findByUserId(userId);

    if (!identity || identity.id !== userId) {
      throw new ForbiddenError(
        "Perfil de usuário indisponível."
      );
    }

    if (
      identity.role !== "CITIZEN" ||
      identity.is_active !== true
    ) {
      throw new ForbiddenError(
        "A desativação é permitida apenas para cidadãos ativos."
      );
    }

    // 1. Revoga as sessões antes de alterar o banco.
    // Se falhar, a conta permanece ativa.
    try {
      await this.auth.revokeSessions(accessToken);
    } catch {
      throw new AppError(
        503,
        "SESSION_REVOCATION_FAILED",
        "Não foi possível encerrar as sessões. A conta não foi desativada."
      );
    }

    // 2. Desativa e anonimiza o perfil no banco.
    // Deve ser uma operação SQL atômica.
    await this.accounts.deactivateAndAnonymize(
      userId,
      accessToken
    );

    // 3. Anonimiza os dados do Supabase Auth
    // e registra a conclusão.
    try {
      await this.auth.anonymizeAuthUser(userId);

      await this.accounts.markAuthCleanupCompleted(
        userId
      );
    } catch {
      // A conta permanece desativada.
      // O registro de pendência permite
      // uma retomada administrativa.
      throw new AppError(
        503,
        "ACCOUNT_DEACTIVATED_AUTH_PENDING",
        "Conta desativada. A limpeza dos dados de autenticação está pendente."
      );
    }
  }
}


import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../../../../shared/errors/app-error.js";

import type {
  AccountProfile,
} from "../../domain/entities/account-profile.entity.js";

import type {
  AccountProfileRepository,
} from "../../domain/repositories/profile.repository.js";

import type {
  ProfileReader,
} from "../../domain/repositories/identity.repository.js";

/**
 * Consulta os dados cadastrais do usuário autenticado.
 */
export class GetMyProfileUseCase {
  constructor(
    private readonly profiles: AccountProfileRepository,
    private readonly identities: ProfileReader
  ) {}

  async execute(
    userId: string | undefined
  ): Promise<AccountProfile> {
    if (!userId) {
      throw new UnauthorizedError();
    }

    // Verifica a situação da conta.
    const identity = await this.identities.findByUserId(
      userId
    );

    if (
      !identity ||
      identity.id !== userId ||
      identity.is_active !== true
    ) {
      throw new ForbiddenError(
        "Perfil inexistente ou conta inativa."
      );
    }

    // Consulta exclusivamente o próprio perfil.
    const profile = await this.profiles.findByUserId(
      userId
    );

    if (!profile || profile.id !== userId) {
      throw new NotFoundError(
        "Perfil cadastral não encontrado."
      );
    }

    return profile;
  }
}

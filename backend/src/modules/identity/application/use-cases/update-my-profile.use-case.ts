
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../../../../shared/errors/app-error.js";

import type {
  AccountProfile,
  UpdateAccountProfileData,
} from "../../domain/entities/account-profile.entity.js";

import type {
  AccountProfileRepository,
} from "../../domain/repositories/profile.repository.js";

import type {
  ProfileReader,
} from "../../domain/repositories/identity.repository.js";

/**
 * Atualiza somente os dados cadastrais permitidos.
 */
export class UpdateMyProfileUseCase {
  constructor(
    private readonly profiles: AccountProfileRepository,
    private readonly identities: ProfileReader
  ) {}

  async execute(
    userId: string | undefined,
    input: UpdateAccountProfileData
  ): Promise<AccountProfile> {
    if (!userId) {
      throw new UnauthorizedError();
    }

    // Confirma que o perfil de autorização existe
    // e que a conta está ativa.
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

    // Cria uma lista explícita dos campos editáveis.
    const changes: UpdateAccountProfileData = {};

    if (input.name !== undefined) {
      changes.name = input.name;
    }

    if (input.phone !== undefined) {
      changes.phone = input.phone;
    }

    if (Object.keys(changes).length === 0) {
      throw new BadRequestError(
        "Informe pelo menos um campo para atualização."
      );
    }

    // Atualiza somente o registro do usuário.
    const updatedProfile =
      await this.profiles.updateByUserId(
        userId,
        changes
      );

    if (
      !updatedProfile ||
      updatedProfile.id !== userId
    ) {
      throw new NotFoundError(
        "Perfil cadastral não encontrado."
      );
    }

    return updatedProfile;
  }
}


import {
  ForbiddenError,
  UnauthorizedError,
} from "../../../../shared/errors/app-error.js";

import type {
  IdentityRole,
} from "../../domain/entities/user-profile.entity.js";

import type {
  ProfileReader,
} from "../../domain/repositories/identity.repository.js";

export interface IdentityResponse {
  id: string;
  role: IdentityRole;
  is_active: boolean;
}

export class GetCurrentUserUseCase {
  constructor(
    private readonly profiles: ProfileReader
  ) {}

  async execute(
    userId: string | undefined,
    requiredRole: IdentityRole
  ): Promise<IdentityResponse> {
    if (!userId) {
      throw new UnauthorizedError(
        "Autenticação necessária."
      );
    }

    const profile = await this.profiles.findByUserId(userId);

    if (!profile || profile.id !== userId) {
      throw new ForbiddenError(
        "Perfil de usuário indisponível."
      );
    }

    if (profile.is_active !== true) {
      throw new ForbiddenError(
        "A conta está inativa."
      );
    }

    if (profile.role !== requiredRole) {
      throw new ForbiddenError(
        "Você não possui permissão para esta operação."
      );
    }

    return {
      id: profile.id,
      role: requiredRole,
      is_active: profile.is_active,
    };
  }
}

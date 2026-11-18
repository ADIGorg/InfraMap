
import {
  ForbiddenError,
  UnauthorizedError,
} from "../../../../shared/errors/app-error.js";

import type {
  AdminLevel,
  IdentityRole,
} from "../../domain/entities/user-profile.entity.js";

import type {
  ProfileReader,
} from "../../domain/repositories/identity.repository.js";

export type IdentityResponse =
  | { id: string; role: "CITIZEN"; is_active: true }
  | { id: string; role: "ADMIN"; is_active: true; admin_level: AdminLevel };

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

    if (requiredRole === "ADMIN") {
      if (profile.admin_level !== "MASTER" && profile.admin_level !== "OPERATIONAL") {
        throw new ForbiddenError("Nível administrativo indisponível.");
      }
      return {
        id: profile.id,
        role: "ADMIN",
        is_active: true,
        admin_level: profile.admin_level,
      };
    }

    // /app/me mantém contrato anterior; não expõe propriedade administrativa.
    return {
      id: profile.id,
      role: "CITIZEN",
      is_active: true,
    };
  }
}

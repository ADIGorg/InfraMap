
import {
  ForbiddenError,
  UnauthorizedError,
} from "../../shared/errors/app-error.js";

// Perfis previstos para a identificação básica.
export type IdentityRole = 'CITIZEN' | 'ADMIN';

export interface UserProfile {
    id: string;
    role: IdentityRole;
    is_active: boolean;
}

// Contrato para consultar perfis.
export interface ProfileReader {
  findByUserId(userId: string): Promise<UserProfile | null>;
}

// Informações permitidas na resposta HTTP.
export interface IdentityResponse {
  id: string;
  role: IdentityRole;
  is_active: boolean;
}

export class IdentityService {
  constructor(
    private readonly profiles: ProfileReader
  ) {}

  async getMe(
    userId: string | undefined,
    requiredRole: IdentityRole
  ): Promise<IdentityResponse> {

    // 1. Exige identidade autenticada.
    if (!userId) {
      throw new UnauthorizedError(
        "Autenticação necessária."
      );
    }

    // 2. Consulta o perfil no banco.
    const profile = await this.profiles.findByUserId(userId);

    // 3. Verifica se o perfil existe e pertence ao usuário.
    if (!profile || profile.id !== userId) {
      throw new ForbiddenError(
        "Perfil de usuário indisponível."
      );
    }

    // 4. Impede operações com contas inativas.
    if (profile.is_active !== true) {
      throw new ForbiddenError(
        "A conta está inativa."
      );
    }

    // 5. Confirma o perfil exigido pelo endpoint.
    if (profile.role !== requiredRole) {
      throw new ForbiddenError(
        "Você não possui permissão para esta operação."
      );
    }

    // 6. Retorna apenas informações autorizadas.
    return {
      id: profile.id,
      role: requiredRole,
      is_active: profile.is_active,
    };
  }
}

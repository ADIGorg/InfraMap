import type { SupabaseClient } from "@supabase/supabase-js";

import { AppError } from "../../../../shared/errors/app-error.js";

import type {
  IdentityRole,
  UserProfile,
} from "../../domain/entities/user-profile.entity.js";

import type {
  ProfileReader,
} from "../../domain/repositories/identity.repository.js";

// Valida os papéis retornados pelo banco.
function isIdentityRole(role: unknown): role is IdentityRole {
  return role === "CITIZEN" || role === "ADMIN";
}

// Implementação concreta do contrato ProfileReader.
export function createProfileReader(
  supabase: SupabaseClient
): ProfileReader {
  return {
    async findByUserId(
      userId: string
    ): Promise<UserProfile | null> {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role, is_active")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        throw new AppError(
          500,
          "IDENTITY_ROLE_QUERY_FAILED",
          "Não foi possível consultar o perfil do usuário."
        );
      }

      if (!data) {
        return null;
      }

      if (
        typeof data.user_id !== "string" ||
        !isIdentityRole(data.role) ||
        typeof data.is_active !== "boolean"
      ) {
        throw new AppError(
          500,
          "INVALID_IDENTITY_ROLE_DATA",
          "Os dados do perfil do usuário são inválidos."
        );
      }

      return {
        id: data.user_id,
        role: data.role,
        is_active: data.is_active,
      };
    },
  };
}
import type { SupabaseClient } from "@supabase/supabase-js";

import { AppError } from "../../../../shared/errors/app-error.js";

import type {
  IdentityRole,
  AdminLevel,
  UserProfile,
} from "../../domain/entities/user-profile.entity.js";

import type {
  ProfileReader,
} from "../../domain/repositories/identity.repository.js";

// Valida os papéis retornados pelo banco.
function isIdentityRole(role: unknown): role is IdentityRole {
  return role === "CITIZEN" || role === "ADMIN";
}

function isAdminLevel(level: unknown): level is AdminLevel {
  return level === "MASTER" || level === "OPERATIONAL";
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
        .select("user_id, role, is_active, admin_level")
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

      // Valor autorizado somente da linha do próprio usuário, filtrada por RLS.
      // Se o banco devolver um ADMIN sem nível válido, falhar fechado.
      if (data.role === "ADMIN" && !isAdminLevel(data.admin_level)) {
        throw new AppError(
          500,
          "INVALID_ADMIN_LEVEL_DATA",
          "O nível administrativo cadastrado é inválido."
        );
      }

      if (data.role === "CITIZEN" && data.admin_level != null) {
        throw new AppError(
          500,
          "INVALID_ADMIN_LEVEL_DATA",
          "O cidadão não pode possuir nível administrativo."
        );
      }

      if (data.role === "ADMIN") {
        return {
          id: data.user_id,
          role: data.role,
          is_active: data.is_active,
          admin_level: data.admin_level as AdminLevel,
        };
      }

      return {
        id: data.user_id,
        role: data.role,
        is_active: data.is_active,
      };
    },
  };
}
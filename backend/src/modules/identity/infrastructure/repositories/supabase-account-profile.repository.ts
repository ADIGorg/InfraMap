
import type { SupabaseClient } from "@supabase/supabase-js";

import { AppError } from "../../../../shared/errors/app-error.js";

import type {
  AccountProfile,
  UpdateAccountProfileData,
} from "../../domain/entities/account-profile.entity.js";

import type {
  AccountProfileRepository,
} from "../../domain/repositories/profile.repository.js";

const PROFILE_COLUMNS =
  "id, name, phone, created_at, updated_at";

/**
 * Implementação do repositório de dados cadastrais.
 *
 * O cliente Supabase deve ser criado com o JWT
 * do usuário autenticado, respeitando a RLS.
 */
export function createAccountProfileRepository(
  supabase: SupabaseClient
): AccountProfileRepository {
  return {
    async findByUserId(
      userId: string
    ): Promise<AccountProfile | null> {
      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        throw new AppError(
          500,
          "PROFILE_QUERY_FAILED",
          "Não foi possível consultar o perfil."
        );
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        name: data.name,
        phone: data.phone,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    },

    async updateByUserId(
      userId: string,
      input: UpdateAccountProfileData
    ): Promise<AccountProfile | null> {
      const changes: UpdateAccountProfileData = {};

      // Envia somente os campos permitidos.
      if (input.name !== undefined) {
        changes.name = input.name;
      }

      if (input.phone !== undefined) {
        changes.phone = input.phone;
      }

      const { data, error } = await supabase
        .from("profiles")
        .update(changes)
        .eq("id", userId)
        .select(PROFILE_COLUMNS)
        .maybeSingle();

      if (error) {
        throw new AppError(
          500,
          "PROFILE_UPDATE_FAILED",
          "Não foi possível atualizar o perfil."
        );
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        name: data.name,
        phone: data.phone,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    },
  };
}

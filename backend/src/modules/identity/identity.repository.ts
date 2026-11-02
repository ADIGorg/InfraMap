
import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ProfileReader,
  UserProfile,
} from "./identity.service.js";

export function createProfileReader(
  supabase: SupabaseClient
): ProfileReader {
  return {
    async findByUserId(
      userId: string
    ): Promise<UserProfile | null> {

      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, is_active")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        // Não expõe detalhes internos do Supabase.
        throw new Error("PROFILE_QUERY_FAILED");
      }

      if (!data) {
        return null;
      }

      // Validação dos dados retornados.
      if (
        typeof data.id !== "string" ||
        typeof data.role !== "string" ||
        typeof data.is_active !== "boolean"
      ) {
        throw new Error("INVALID_PROFILE_DATA");
      }

      return {
        id: data.id,
        role: data.role,
        is_active: data.is_active,
      };
    },
  };
}

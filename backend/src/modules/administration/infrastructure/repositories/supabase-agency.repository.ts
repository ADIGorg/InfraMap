import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError, BadRequestError, ForbiddenError, NotFoundError } from "../../../../shared/errors/app-error.js";

interface AgencyChanges {
  name?: string | undefined;
  email?: string | undefined;
  phone?: string | null | undefined;
  description?: string | null | undefined;
  is_active?: boolean | undefined;
}

const columns = "id,name,email,phone,description,is_active,created_at,updated_at";

function handleError(error: { code: string } | null) {
  if (!error) return;
  if (error.code === "42501") throw new ForbiddenError();
  if (error.code === "23514") throw new BadRequestError("Nome ou e-mail do órgão inválido.");
  throw new AppError(500, "INTERNAL_SERVER_ERROR", "Não foi possível gerenciar órgãos.");
}

export function createAgencyRepository(client: SupabaseClient) {
  return {
    async list() {
      const { data, error } = await client.from("agencies").select(columns)
        .order("name").order("id");
      handleError(error);
      return data;
    },

    async create(agency: AgencyChanges & { name: string; email: string }) {
      const { data, error } = await client.from("agencies").insert(agency).select(columns).single();
      handleError(error);
      return data;
    },

    async update(id: string, changes: AgencyChanges) {
      const { data, error } = await client.from("agencies").update(changes)
        .eq("id", id).select(columns).maybeSingle();
      handleError(error);
      if (!data) throw new NotFoundError("Órgão não encontrado.");
      return data;
    },
  };
}

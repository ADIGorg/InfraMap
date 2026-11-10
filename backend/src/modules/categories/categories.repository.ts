
import type { SupabaseClient } from "@supabase/supabase-js";

import { AppError } from "../../shared/errors/app-error.js";

// Dados permitidos na resposta pública.
export interface CategoryDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

// Contrato de leitura de categorias.
export interface CategoriesRepository {
  listActive(): Promise<CategoryDto[]>;
}

// Implementação do repositório utilizando Supabase.
export function createCategoriesRepository(
  supabase: SupabaseClient
): CategoriesRepository {
  return {
    async listActive(): Promise<CategoryDto[]> {
      const { data, error } = await supabase
        .from("categories")
        .select("id, code, name, description")
        .eq("is_active", true)
        .order("code", { ascending: true });

      if (error) {
        throw new AppError(
          500,
          "CATEGORIES_QUERY_FAILED",
          "Não foi possível consultar as categorias."
        );
      }

      return (data ?? []).map((category) => ({
        id: category.id,
        code: category.code,
        name: category.name,
        description: category.description,
      }));
    },
  };
}

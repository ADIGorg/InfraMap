import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError, ConflictError, ForbiddenError, NotFoundError } from "../../../../shared/errors/app-error.js";
import type { VoteRepository } from "../../domain/repositories/vote.repository.js";

export function createVoteRepository(client: SupabaseClient): VoteRepository {
  return {
    async register(id, action) {
      const { data, error } = await client.rpc("register_vote", {
        p_occurrence_id: id,
        p_action: action,
      }).single<{ occurrence_id: string; new_count: number }>();

      if (error?.code === "42501") throw new ForbiddenError("Voto não permitido.");
      if (error?.code === "P0002") throw new NotFoundError("Ocorrência ou voto não encontrado.");
      if (error?.code === "23505") throw new ConflictError("Você já votou nesta ocorrência.");
      if (error?.code === "22023") throw new ConflictError("A ocorrência não está elegível para votação.");
      if (error || !data) {
        throw new AppError(500, "INTERNAL_SERVER_ERROR", "Não foi possível registrar a operação de voto.");
      }

      return { occurrence_id: data.occurrence_id, vote_count: data.new_count };
    },

    async countPublic(id) {
      const { data, error } = await client.from("public_occurrences")
        .select("id,vote_count").eq("id", id).maybeSingle();

      if (error) throw new AppError(500, "INTERNAL_SERVER_ERROR", "Não foi possível consultar os votos.");
      if (!data) throw new NotFoundError("Ocorrência pública não encontrada.");

      return { occurrence_id: data.id, vote_count: data.vote_count };
    },
  };
}
